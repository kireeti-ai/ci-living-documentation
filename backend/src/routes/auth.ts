import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, otpCodes, passwordResetTokens } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'
import { generateToken } from '../utils/jwt.js'
import { generateOtp, sendOtpEmail, sendPasswordResetEmail } from '../utils/email.js'
import { authenticate } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(2),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
})

const resendOtpSchema = z.object({
  email: z.string().email(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// POST /auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const validation = signupSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email, password, username } = validation.data

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      if (existingUser.isActive) {
        return res.status(400).json({ detail: 'Email already registered' })
      }
      // User exists but not verified - delete and allow re-registration
      await db.delete(users).where(eq(users.id, existingUser.id))
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        username,
        role: 'user',
        isActive: false,
      })
      .returning()

    // Generate and store OTP
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await db.insert(otpCodes).values({
      userId: newUser.id,
      code: otp,
      expiresAt,
    })

    // Send OTP email
    await sendOtpEmail(email, otp)

    return res.status(201).json({
      message: 'User created. Please verify your email.',
      email: newUser.email,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ detail: 'Failed to create user' })
  }
})

// POST /auth/signup/verify_otp
router.post('/signup/verify_otp', async (req: Request, res: Response) => {
  try {
    const validation = verifyOtpSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email, otp } = validation.data

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return res.status(404).json({ detail: 'User not found' })
    }

    if (user.isActive) {
      return res.status(400).json({ detail: 'Email already verified' })
    }

    // Find valid OTP
    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, user.id),
          eq(otpCodes.code, otp),
          gt(otpCodes.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!otpRecord) {
      return res.status(400).json({ detail: 'Invalid or expired OTP' })
    }

    // Activate user
    await db
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, user.id))

    // Delete used OTP
    await db.delete(otpCodes).where(eq(otpCodes.userId, user.id))

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return res.json({
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_active: true,
        created_at: user.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return res.status(500).json({ detail: 'Failed to verify OTP' })
  }
})

// POST /auth/resend_otp
router.post('/resend_otp', async (req: Request, res: Response) => {
  try {
    const validation = resendOtpSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email } = validation.data

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return res.status(404).json({ detail: 'User not found' })
    }

    if (user.isActive) {
      return res.status(400).json({ detail: 'Email already verified' })
    }

    // Delete old OTPs
    await db.delete(otpCodes).where(eq(otpCodes.userId, user.id))

    // Generate and store new OTP
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await db.insert(otpCodes).values({
      userId: user.id,
      code: otp,
      expiresAt,
    })

    // Send OTP email
    await sendOtpEmail(email, otp)

    return res.json({ message: 'OTP sent successfully' })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return res.status(500).json({ detail: 'Failed to resend OTP' })
  }
})

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email, password } = validation.data

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ detail: 'Invalid email or password' })
    }

    // Check if active
    if (!user.isActive) {
      return res.status(401).json({ detail: 'Please verify your email first' })
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return res.json({
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_active: user.isActive,
        created_at: user.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ detail: 'Login failed' })
  }
})

// POST /auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side
  // For a more robust solution, you could implement token blacklisting
  return res.json({ message: 'Logged out successfully' })
})

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1)

    if (!user) {
      return res.status(404).json({ detail: 'User not found' })
    }

    return res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_active: user.isActive,
      created_at: user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Get me error:', error)
    return res.status(500).json({ detail: 'Failed to get user info' })
  }
})

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email } = validation.data

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    // Don't reveal if user exists or not for security
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
    }

    if (!user.isActive) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
    }

    // Delete any existing reset tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store reset token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt,
    })

    // Send reset email
    await sendPasswordResetEmail(email, resetToken)

    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({ detail: 'Failed to process request' })
  }
})

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { token, password } = validation.data

    // Find valid reset token
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!resetRecord) {
      return res.status(400).json({ detail: 'Invalid or expired reset token' })
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, resetRecord.userId))
      .limit(1)

    if (!user) {
      return res.status(404).json({ detail: 'User not found' })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    // Delete used reset token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))

    return res.json({ message: 'Password reset successful. You can now login with your new password.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ detail: 'Failed to reset password' })
  }
})

export default router

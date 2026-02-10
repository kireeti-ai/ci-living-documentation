import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq, ne } from 'drizzle-orm'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

// All routes require authentication and admin role
router.use(authenticate)
router.use(requireAdmin)

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(2),
  role: z.enum(['admin', 'user']),
})

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
})

// GET /users - Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users)

    return res.json(
      allUsers.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_active: user.isActive,
        created_at: user.createdAt.toISOString(),
      }))
    )
  } catch (error) {
    console.error('Get users error:', error)
    return res.status(500).json({ detail: 'Failed to fetch users' })
  }
})

// POST /users - Create a new user (admin can create activated users)
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createUserSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email, password, username, role } = validation.data

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (admin-created users are automatically active)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        username,
        role,
        isActive: true,
      })
      .returning()

    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      is_active: newUser.isActive,
      created_at: newUser.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Create user error:', error)
    return res.status(500).json({ detail: 'Failed to create user' })
  }
})

// PATCH /users/:userId/role - Update user role
router.patch('/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const validation = updateRoleSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { role } = validation.data

    // Prevent admin from changing their own role
    if (userId === req.user!.id) {
      return res.status(400).json({ detail: 'Cannot change your own role' })
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return res.status(404).json({ detail: 'User not found' })
    }

    // Update role
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    return res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      is_active: updatedUser.isActive,
      created_at: updatedUser.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Update user role error:', error)
    return res.status(500).json({ detail: 'Failed to update user role' })
  }
})

// DELETE /users/:userId - Delete a user
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // Prevent admin from deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ detail: 'Cannot delete your own account' })
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return res.status(404).json({ detail: 'User not found' })
    }

    // Delete user
    await db.delete(users).where(eq(users.id, userId))

    return res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ detail: 'Failed to delete user' })
  }
})

export default router

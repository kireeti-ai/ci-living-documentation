import { Resend } from 'resend'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

// Default sender email - use your verified domain or Resend's default
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const sendOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  console.log(`[EMAIL] Attempting to send OTP email to: ${email}`)
  console.log(`[EMAIL] NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`[EMAIL] RESEND_API_KEY configured: ${!!process.env.RESEND_API_KEY}`)
  
  try {
    // In development, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n========================================`)
      console.log(`OTP for ${email}: ${otp}`)
      console.log(`========================================\n`)
      return true
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL] ERROR: RESEND_API_KEY not configured!')
      return false
    }

    console.log(`[EMAIL] Sending email via Resend...`)
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'OTP verification from Automatic Docs generator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold;">
            ${otp}
          </div>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
    })

    if (error) {
      console.error('[EMAIL] Resend error:', error)
      return false
    }

    console.log(`[EMAIL] Email sent successfully to: ${email}, ID: ${data?.id}`)
    return true
  } catch (error) {
    console.error('[EMAIL] Failed to send OTP email:', error)
    return false
  }
}

export const sendProjectInviteEmail = async (
  email: string,
  projectName: string,
  inviterName: string,
  token: string
): Promise<boolean> => {
  try {
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${token}`

    // In development, just log the invite
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n========================================`)
      console.log(`Project Invite for ${email}`)
      console.log(`Project: ${projectName}`)
      console.log(`Invited by: ${inviterName}`)
      console.log(`Invite URL: ${inviteUrl}`)
      console.log(`========================================\n`)
      return true
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL] ERROR: RESEND_API_KEY not configured!')
      return false
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been invited to join ${projectName} - CI Living Documentation`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Project Invitation</h2>
          <p>Hi there!</p>
          <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong> on CI Living Documentation.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    })

    if (error) {
      console.error('[EMAIL] Failed to send invite email:', error)
      return false
    }

    console.log(`[EMAIL] Invite email sent to: ${email}, ID: ${data?.id}`)
    return true
  } catch (error) {
    console.error('Failed to send project invite email:', error)
    return false
  }
}

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<boolean> => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`

    // In development, just log the reset link
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n========================================`)
      console.log(`Password Reset for ${email}`)
      console.log(`Reset URL: ${resetUrl}`)
      console.log(`========================================\n`)
      return true
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL] ERROR: RESEND_API_KEY not configured!')
      return false
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Password Reset Request - CI Living Documentation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi there!</p>
          <p>We received a request to reset your password for your CI Living Documentation account.</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
      `,
    })

    if (error) {
      console.error('[EMAIL] Failed to send password reset email:', error)
      return false
    }

    console.log(`[EMAIL] Password reset email sent to: ${email}, ID: ${data?.id}`)
    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return false
  }
}

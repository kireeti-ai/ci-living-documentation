import * as brevo from '@getbrevo/brevo'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Brevo API client lazily
let apiInstance: brevo.TransactionalEmailsApi | null = null

const getBrevoClient = () => {
  if (!apiInstance) {
    apiInstance = new brevo.TransactionalEmailsApi()
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY || ''
    )
  }
  return apiInstance
}

// Default sender email - set your verified sender in Brevo
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@ci-living-docs.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'CI Living Docs'

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const sendOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  console.log(`[EMAIL] Attempting to send OTP email to: ${email}`)
  console.log(`[EMAIL] NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`[EMAIL] BREVO_API_KEY configured: ${!!process.env.BREVO_API_KEY}`)
  
  try {
    // In development, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n========================================`)
      console.log(`OTP for ${email}: ${otp}`)
      console.log(`========================================\n`)
      return true
    }

    if (!process.env.BREVO_API_KEY) {
      console.error('[EMAIL] ERROR: BREVO_API_KEY not configured!')
      return false
    }

    console.log(`[EMAIL] Sending email via Brevo...`)
    
    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.subject = 'OTP verification from Automatic Docs generator'
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold;">
          ${otp}
        </div>
        <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      </div>
    `
    sendSmtpEmail.sender = { name: FROM_NAME, email: FROM_EMAIL }
    sendSmtpEmail.to = [{ email: email }]

    const api = getBrevoClient()
    const result = await api.sendTransacEmail(sendSmtpEmail)

    console.log(`[EMAIL] Email sent successfully to: ${email}, MessageId: ${result.body.messageId}`)
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

    if (!process.env.BREVO_API_KEY) {
      console.error('[EMAIL] ERROR: BREVO_API_KEY not configured!')
      return false
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.subject = `You've been invited to join ${projectName} - CI Living Documentation`
    sendSmtpEmail.htmlContent = `
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
    `
    sendSmtpEmail.sender = { name: FROM_NAME, email: FROM_EMAIL }
    sendSmtpEmail.to = [{ email: email }]

    const api = getBrevoClient()
    const result = await api.sendTransacEmail(sendSmtpEmail)

    console.log(`[EMAIL] Invite email sent to: ${email}, MessageId: ${result.body.messageId}`)
    return true
  } catch (error) {
    console.error('[EMAIL] Failed to send project invite email:', error)
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

    if (!process.env.BREVO_API_KEY) {
      console.error('[EMAIL] ERROR: BREVO_API_KEY not configured!')
      return false
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.subject = 'Password Reset Request - CI Living Documentation'
    sendSmtpEmail.htmlContent = `
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
    `
    sendSmtpEmail.sender = { name: FROM_NAME, email: FROM_EMAIL }
    sendSmtpEmail.to = [{ email: email }]

    const api = getBrevoClient()
    const result = await api.sendTransacEmail(sendSmtpEmail)

    console.log(`[EMAIL] Password reset email sent to: ${email}, MessageId: ${result.body.messageId}`)
    return true
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error)
    return false
  }
}

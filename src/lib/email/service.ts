import { resend } from './client'
import { EmailVerificationTemplate, PasswordResetTemplate } from './templates'
import { renderAsync } from '@react-email/components'

interface SendVerificationEmailParams {
  to: string
  displayName: string
  verificationUrl: string
  from?: string
}

interface SendPasswordResetEmailParams {
  to: string
  displayName: string
  resetUrl: string
  from?: string
}

export class EmailService {
  private static readonly DEFAULT_FROM = 'onboarding@resend.dev'
  private static readonly APP_NAME = 'Udaman'
  private static readonly APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

  /**
   * Send email verification email
   */
  static async sendVerificationEmail({
    to,
    displayName,
    verificationUrl,
    from = this.DEFAULT_FROM
  }: SendVerificationEmailParams) {
    try {
      const emailHtml = await renderAsync(
        EmailVerificationTemplate({
          userEmail: to,
          displayName,
          verificationUrl,
          appName: this.APP_NAME,
          appUrl: this.APP_URL
        })
      )

      const { data, error } = await resend.emails.send({
        from,
        to: [to],
        subject: `Verify your email address - ${this.APP_NAME}`,
        html: emailHtml,
      })

      if (error) {
        console.error('Failed to send verification email:', error)
        throw new Error(`Failed to send verification email: ${error.message}`)
      }

      console.log('Verification email sent successfully:', data)
      return data
    } catch (error) {
      console.error('Error sending verification email:', error)
      throw error
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail({
    to,
    displayName,
    resetUrl,
    from = this.DEFAULT_FROM
  }: SendPasswordResetEmailParams) {
    try {
      const emailHtml = await renderAsync(
        PasswordResetTemplate({
          userEmail: to,
          displayName,
          resetUrl,
          appName: this.APP_NAME,
          appUrl: this.APP_URL
        })
      )

      const { data, error } = await resend.emails.send({
        from,
        to: [to],
        subject: `Reset your password - ${this.APP_NAME}`,
        html: emailHtml,
      })

      if (error) {
        console.error('Failed to send password reset email:', error)
        throw new Error(`Failed to send password reset email: ${error.message}`)
      }

      console.log('Password reset email sent successfully:', data)
      return data
    } catch (error) {
      console.error('Error sending password reset email:', error)
      throw error
    }
  }

  /**
   * Send a simple text email (for testing or simple notifications)
   */
  static async sendSimpleEmail({
    to,
    subject,
    text,
    from = this.DEFAULT_FROM
  }: {
    to: string
    subject: string
    text: string
    from?: string
  }) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: [to],
        subject,
        text,
      })

      if (error) {
        console.error('Failed to send simple email:', error)
        throw new Error(`Failed to send email: ${error.message}`)
      }

      console.log('Simple email sent successfully:', data)
      return data
    } catch (error) {
      console.error('Error sending simple email:', error)
      throw error
    }
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get the configured from email address
   */
  static getFromEmail(): string {
    return this.DEFAULT_FROM
  }
}

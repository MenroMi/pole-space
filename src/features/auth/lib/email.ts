import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// from: using Resend's shared test domain for development.
// Replace with a verified domain before production launch.
const FROM = 'onboarding@resend.dev'

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const verifyUrl = `${base}/api/auth/verify?token=${token}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your email — Pole Dance Catalog',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. The link expires in 24 hours.</p>`,
  })

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
}

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Password reset — Pole Space',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. The link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

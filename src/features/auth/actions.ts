'use server'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/shared/lib/prisma'
import { signupSchema } from './lib/validation'
import { generateVerificationToken, deleteUserTokens } from './lib/tokens'
import { sendVerificationEmail } from './lib/email'
import type { SignupFormData } from './lib/validation'

export async function signupAction(data: SignupFormData) {
  const parsed = signupSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid input' }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { error: 'Email already in use' }

  const hashed = await bcrypt.hash(parsed.data.password, 10)
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashed,
      emailVerified: null,
    },
  })

  const token = await generateVerificationToken(parsed.data.email)

  try {
    await sendVerificationEmail(parsed.data.email, token)
  } catch {
    await deleteUserTokens(parsed.data.email)
    await prisma.user.delete({ where: { email: parsed.data.email } })
    return { error: 'Failed to send email, please try again' }
  }

  redirect('/verify-email?sent=true')
}

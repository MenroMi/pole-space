'use server'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/shared/lib/prisma'
import { signupSchema } from './lib/validation'
import { generateVerificationToken, deleteUserTokens } from './lib/tokens'
import { sendVerificationEmail } from './lib/email'
import type { SignupFormData } from './lib/validation'
import { signIn } from '@/shared/lib/auth'
import { AuthError } from 'next-auth'
import type { LoginFormData } from './lib/validation'

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

export async function loginAction(data: LoginFormData) {
  try {
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirectTo: '/catalog',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = error.cause as { err?: Error } | undefined
      return { error: cause?.err?.message ?? 'Invalid credentials' }
    }
    throw error
  }
}

export async function resendVerificationAction(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.emailVerified !== null) {
    redirect('/verify-email?error=invalid')
  }

  await deleteUserTokens(email)
  const token = await generateVerificationToken(email)

  try {
    await sendVerificationEmail(email, token)
  } catch {
    await deleteUserTokens(email)
    redirect('/verify-email?error=send-failed')
  }

  redirect('/verify-email?sent=true')
}

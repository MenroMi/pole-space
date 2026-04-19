'use server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/shared/lib/prisma'
import type { SignupFormData } from './types'

export async function signupAction(data: SignupFormData) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('Email already in use')

  const hashed = await bcrypt.hash(data.password, 10)
  await prisma.user.create({
    data: { email: data.email, name: data.name, password: hashed },
  })
}

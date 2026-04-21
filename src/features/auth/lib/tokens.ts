import crypto from 'crypto'

import { prisma } from '@/shared/lib/prisma'

export async function generateVerificationToken(email: string): Promise<string> {
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  return token
}

export async function deleteVerificationToken(token: string): Promise<void> {
  await prisma.verificationToken.delete({ where: { token } })
}

export async function deleteUserTokens(email: string): Promise<void> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } })
}

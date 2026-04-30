import crypto from 'crypto';

import { prisma } from '@/shared/lib/prisma';

export async function generateResetToken(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });
  return token;
}

export async function findResetToken(token: string) {
  return prisma.passwordResetToken.findUnique({ where: { token } });
}

export async function deleteResetToken(token: string): Promise<void> {
  await prisma.passwordResetToken.delete({ where: { token } });
}

export async function deleteResetTokensByEmail(email: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { email } });
}

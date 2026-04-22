import { prisma } from '@/shared/lib/prisma';

export const RESEND_COOLDOWN_S = 60;
export const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_S * 1000;

export async function getResendCooldownRemaining(email: string): Promise<number> {
  const existing = await prisma.verificationToken.findFirst({ where: { identifier: email } });
  if (!existing) return 0;
  return Math.max(
    0,
    Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt.getTime())) / 1000),
  );
}

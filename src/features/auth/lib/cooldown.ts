import 'server-only';

import { prisma } from '@/shared/lib/prisma';

import { RESEND_COOLDOWN_MS } from './cooldown-config';

export async function getResendCooldownRemaining(email: string): Promise<number> {
  const existing = await prisma.verificationToken.findFirst({ where: { identifier: email } });
  if (!existing) return 0;
  return Math.max(
    0,
    Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt.getTime())) / 1000),
  );
}

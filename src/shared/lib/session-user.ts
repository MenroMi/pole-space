import type { Role } from '@prisma/client';

import { auth } from './auth';
import { prisma } from './prisma';

export type ActiveSessionUser = { id: string; role: Role };

/**
 * Resolves the current session user against the DB.
 * JWT `role`/`blockedAt` are snapshots from sign-in (session lives up to 7 days),
 * so authorization must re-read them: returns null when there is no session,
 * the user was deleted, or the user is blocked.
 */
export async function getActiveSessionUser(): Promise<ActiveSessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, blockedAt: true },
  });
  if (!user || user.blockedAt) return null;

  return { id, role: user.role };
}

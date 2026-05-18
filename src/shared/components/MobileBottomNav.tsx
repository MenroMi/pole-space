import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import MobileBottomNavClient from './MobileBottomNavClient';

export default async function MobileBottomNav() {
  const session = await auth();
  let role: string | null = null;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    role = dbUser?.role ?? null;
  }
  return <MobileBottomNavClient role={role} />;
}

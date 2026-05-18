import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import MobileBottomNavClient from './MobileBottomNavClient';

export default async function MobileBottomNav() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return <MobileBottomNavClient role={dbUser?.role ?? null} />;
}

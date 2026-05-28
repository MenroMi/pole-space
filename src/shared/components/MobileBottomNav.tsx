import { auth } from '@/shared/lib/auth';

import MobileBottomNavClient from './MobileBottomNavClient';

export default async function MobileBottomNav() {
  const session = await auth();
  const role = (session?.user?.role as string | null) ?? null;
  return <MobileBottomNavClient role={role} />;
}

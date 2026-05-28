import { AdminApp } from '@/features/admin/components/AdminApp';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export default async function AdminPage() {
  const session = await auth();
  const currentUserId = session?.user?.id ?? null;
  let currentUserName: string | null = null;
  let currentUserImage: string | null = null;
  if (currentUserId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { firstName: true, lastName: true, image: true },
    });
    if (dbUser) {
      currentUserName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null;
      currentUserImage = dbUser.image ?? null;
    }
  }
  return (
    <AdminApp
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserImage={currentUserImage}
    />
  );
}

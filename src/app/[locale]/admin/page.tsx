import { AdminApp } from '@/features/admin/components/AdminApp';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export default async function AdminPage() {
  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  let currentUserName: string | null = null;
  let currentUserImage: string | null = null;

  if (currentUserId) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { firstName: true, lastName: true, image: true },
    });
    if (user) {
      currentUserName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
      currentUserImage = user.image;
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

import SettingsForm from '@/features/profile/components/SettingsForm';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, password: true },
      })
    : null;

  return (
    <SettingsForm
      name={user?.name ?? null}
      image={user?.image ?? null}
      hasPassword={user?.password != null}
    />
  );
}

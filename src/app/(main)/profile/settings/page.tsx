import SettingsForm from '@/features/profile/components/SettingsForm';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          username: true,
          image: true,
          location: true,
          email: true,
          password: true,
        },
      })
    : null;

  return (
    <SettingsForm
      firstName={user?.firstName ?? null}
      lastName={user?.lastName ?? null}
      username={user?.username ?? null}
      image={user?.image ?? null}
      location={user?.location ?? null}
      email={user?.email ?? null}
      hasPassword={user?.password != null}
    />
  );
}

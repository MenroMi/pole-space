import { redirect } from 'next/navigation';

import ProfileAside from '@/features/profile/components/ProfileAside';
import PageShell from '@/shared/components/PageShell';
import { auth } from '@/shared/lib/auth';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <PageShell
      aside={
        <ProfileAside name={session?.user?.name ?? null} image={session?.user?.image ?? null} />
      }
    >
      {children}
    </PageShell>
  );
}

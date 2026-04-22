import { auth } from '@/shared/lib/auth';
import ProfileAside from '@/features/profile/components/ProfileAside';
import PageShell from '@/shared/components/PageShell';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <PageShell
      aside={
        <ProfileAside
          name={session?.user?.name ?? null}
          image={session?.user?.image ?? null}
        />
      }
    >
      {children}
    </PageShell>
  );
}

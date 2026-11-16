import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import ProfileAside from '@/features/profile/components/ProfileAside';
import ProfileMobileNav from '@/features/profile/components/ProfileMobileNav';
import PageShell from '@/shared/components/PageShell';
import { SessionGuard } from '@/shared/components/SessionGuard';
import { auth } from '@/shared/lib/auth';
import { getActiveSessionUser } from '@/shared/lib/session-user';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  // JWT outlives a block/delete — re-check the DB. Not /login: proxy bounces a
  // still-valid session from /login to /catalog anyway.
  if (!(await getActiveSessionUser())) {
    const locale = await getLocale();
    redirect(`/${locale}/catalog`);
  }

  return (
    <SessionGuard>
      <PageShell aside={<ProfileAside />}>
        <>
          <ProfileMobileNav />
          {children}
        </>
      </PageShell>
    </SessionGuard>
  );
}

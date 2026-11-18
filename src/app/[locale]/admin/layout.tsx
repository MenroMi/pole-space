import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { checkedLocale } from '@/i18n/routing';
import { getActiveSessionUser } from '@/shared/lib/session-user';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getActiveSessionUser();
  if (!user || user.role !== 'ADMIN') {
    redirect({ href: '/', locale: checkedLocale(await getLocale()) });
  }
  return <>{children}</>;
}

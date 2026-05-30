import { Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import FavouritesButton from './FavouritesButton';
import HeaderNav from './HeaderNav';
import LocaleSwitcher from './LocaleSwitcher';
import UserMenu from './UserMenu';

export default async function Header() {
  const [session, t] = await Promise.all([auth(), getTranslations('nav')]);
  // Name, image and role are read fresh from DB (not the session JWT): the JWT can
  // lag behind a profile edit (it's updated client-side after revalidatePath has
  // already re-rendered this layout), and admin demotion must take effect immediately
  // rather than persisting up to 7 days until JWT expiry.
  const userId = session?.user?.id;
  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, firstName: true, lastName: true, image: true },
      })
    : null;
  const role = dbUser?.role ?? null;
  const user = dbUser
    ? {
        name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null,
        image: dbUser.image ?? null,
      }
    : null;

  return (
    <header
      className="sticky top-0 z-50 h-14 border-b border-outline-variant/30 backdrop-blur-xl sm:h-[60px]"
      style={{ backgroundColor: 'rgba(19, 19, 19, 0.92)' }}
    >
      <div className="relative mx-auto flex h-full w-full max-w-[2560px] items-center justify-between px-5 sm:px-6">
        {/* Left: brand */}
        <Link
          href={session ? '/catalog' : '/'}
          className="font-display text-[16px] font-semibold tracking-tight text-on-surface lowercase sm:text-[17px]"
        >
          pole space<span className="text-primary">.</span>
        </Link>

        {/* Center: pill nav — desktop only, truly centered via absolute */}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
          <div className="pointer-events-auto">
            <HeaderNav />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {/* Desktop-only */}
          <div className="hidden items-center gap-1 sm:flex">
            <FavouritesButton />
            <UserMenu user={user} role={role} />
          </div>
          {/* Admin shortcut — mobile only, admin role only */}
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              aria-label={t('admin')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors hover:border-primary/20 hover:bg-primary/[0.06] sm:hidden"
            >
              <Shield size={18} aria-hidden="true" />
            </Link>
          )}
          {/* Always: locale switcher */}
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}

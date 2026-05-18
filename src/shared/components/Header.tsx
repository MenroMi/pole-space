import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import FavouritesButton from './FavouritesButton';
import HeaderNav from './HeaderNav';
import LocaleSwitcher from './LocaleSwitcher';
import UserMenu from './UserMenu';

export default async function Header() {
  const session = await auth();
  let user: { name: string | null; image: string | null } | null = null;
  let role: string | null = null;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, image: true, role: true },
    });
    if (dbUser) {
      const name = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || null;
      user = { name, image: dbUser.image ?? null };
      role = dbUser.role;
    }
  }

  const initials = user?.name?.[0]?.toUpperCase() ?? (session ? '?' : null);

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
          {/* Mobile-only: avatar circle */}
          {session && initials && (
            <Link
              href="/profile"
              aria-label="Profile"
              className="relative mr-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-[11px] font-bold text-[#1b1b1b] sm:hidden"
              style={{ background: 'linear-gradient(135deg, #52416c, #dcb8ff)' }}
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? 'avatar'}
                  fill
                  sizes="30px"
                  className="object-cover"
                />
              ) : (
                initials
              )}
            </Link>
          )}
          {/* Always: locale switcher */}
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}

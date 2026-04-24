import Link from 'next/link';

import { auth } from '@/shared/lib/auth';

import HeaderNav from './HeaderNav';
import UserMenu from './UserMenu';

export default async function Header() {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? null, image: session.user.image ?? null }
    : null;

  return (
    <header
      className="sticky top-0 z-50 flex h-16 items-center justify-between px-8 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(19, 19, 19, 0.8)' }}
    >
      <Link
        href="/"
        className="font-display text-lg font-semibold tracking-tight text-on-surface lowercase"
      >
        pole space
      </Link>

      <HeaderNav />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Search"
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        <UserMenu user={user} />
      </div>
    </header>
  );
}

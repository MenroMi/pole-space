import Link from 'next/link'
import { auth } from '@/shared/lib/auth'
import HeaderNav from './HeaderNav'

export default async function Header() {
  const session = await auth()
  const accountHref = session ? '/profile' : '/login'

  return (
    <header
      className="sticky top-0 z-50 flex h-16 items-center justify-between px-8 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(19, 19, 19, 0.8)' }}
    >
      <Link
        href="/"
        className="font-display text-lg font-semibold lowercase tracking-tight text-on-surface"
      >
        kinetic gallery
      </Link>

      <HeaderNav />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Search"
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        <Link
          href={accountHref}
          data-testid="account-link"
          aria-label="Account"
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </Link>
      </div>
    </header>
  )
}

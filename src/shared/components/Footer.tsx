'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    label: 'Gallery',
    href: '/catalog',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Moves',
    href: '/moves',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export default function Footer() {
  const pathname = usePathname();

  return (
    <footer className="h-14 bg-surface-lowest">
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-8">
        <nav className="flex gap-6">
          {NAV_ITEMS.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 text-sm transition-colors ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <span className="font-sans text-xs tracking-widest text-on-surface-variant uppercase">
          pole space v.0.1
        </span>
      </div>
    </footer>
  );
}

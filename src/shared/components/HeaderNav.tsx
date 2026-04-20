'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { label: 'Catalog', href: '/catalog' },
  { label: 'Moves', href: '/moves' },
]

export default function HeaderNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-8">
      {NAV_LINKS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm font-medium transition-colors ${
            pathname === href || pathname.startsWith(href + '/')
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

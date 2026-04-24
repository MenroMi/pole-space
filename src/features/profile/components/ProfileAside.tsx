'use client';
import { LayoutDashboard, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/profile', label: 'Overview', icon: LayoutDashboard },
  { href: '/profile/progress', label: 'Progress', icon: TrendingUp },
  { href: '/profile/favourite-moves', label: 'Favourite Moves', icon: Star },
];

export default function ProfileAside() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === href
              ? 'bg-primary-container font-medium text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
          }`}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

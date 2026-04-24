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
    <nav className="flex h-full flex-col gap-2 py-10 font-display text-xs uppercase tracking-widest">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`mx-4 my-1 flex items-center gap-4 rounded-md px-4 py-3 transition-all duration-200 active:scale-95 hover:translate-x-1 ${
            pathname === href
              ? 'bg-gradient-to-br from-primary to-primary-container font-bold text-surface'
              : 'text-outline hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <Icon size={20} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

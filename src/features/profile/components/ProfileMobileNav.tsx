'use client';
import { Heart, LayoutDashboard, Settings, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

const NAV_ITEMS = [
  { href: '/profile', label: 'overview', icon: LayoutDashboard, matches: ['/profile'] },
  {
    href: '/profile/progress',
    label: 'progress',
    icon: TrendingUp,
    matches: ['/profile/progress'],
  },
  {
    href: '/profile/favourite-moves',
    label: 'favourites',
    icon: Heart,
    matches: ['/profile/favourite-moves'],
  },
  { href: '/profile/settings', label: 'settings', icon: Settings, matches: ['/profile/settings'] },
] as const;

export default function ProfileMobileNav() {
  const t = useTranslations('profile');
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-[60px] z-10 flex gap-1.5 overflow-x-auto border-b border-outline-variant/20 bg-surface/80 px-3.5 py-2.5 backdrop-blur-md lg:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, matches }) => {
        const isActive = (matches as readonly string[]).includes(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-[11px] font-semibold transition-colors',
              isActive
                ? 'bg-linear-to-br from-primary to-primary-container text-surface'
                : 'border border-outline-variant/40 text-on-surface-variant hover:border-outline-variant hover:text-on-surface',
            ].join(' ')}
          >
            <Icon size={12} aria-hidden="true" />
            {t(label)}
          </Link>
        );
      })}
      <div className="w-3.5 shrink-0" />
    </nav>
  );
}

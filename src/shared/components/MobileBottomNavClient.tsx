'use client';

import { Heart, LayoutGrid, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

interface Props {
  role: string | null;
}

export default function MobileBottomNavClient({ role: _role }: Props) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const tabs = [
    { href: '/catalog' as const, icon: LayoutGrid, label: t('catalog') },
    { href: '/profile/favourite-moves' as const, icon: Heart, label: t('favourites') },
    { href: '/profile' as const, icon: User, label: t('profile') },
  ];

  function isActive(href: string): boolean {
    if (href === '/profile') {
      return (
        pathname === '/profile' ||
        (pathname.startsWith('/profile') && !pathname.startsWith('/profile/favourite-moves'))
      );
    }
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/20 sm:hidden"
      style={{
        backgroundColor: 'rgba(13, 14, 15, 0.92)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-[60px] items-stretch">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
              style={{ position: 'relative' }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 2.5,
                    borderRadius: 2,
                    background: '#8458b3',
                  }}
                />
              )}
              <Icon size={20} />
              <span
                className={`font-sans text-[9px] capitalize ${active ? 'font-bold' : 'font-medium'}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

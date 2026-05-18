'use client';

import { Heart, LayoutGrid, User } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';

interface Props {
  role: string | null;
}

const tabs = [
  { href: '/catalog' as const, icon: LayoutGrid, label: 'catalog' },
  { href: '/profile/favourite-moves' as const, icon: Heart, label: 'saved' },
  { href: '/profile' as const, icon: User, label: 'profile' },
];

export default function MobileBottomNavClient({ role: _role }: Props) {
  const pathname = usePathname();

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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/20 backdrop-blur-xl sm:hidden"
      style={{
        backgroundColor: 'rgba(13, 14, 15, 0.92)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-14 items-stretch">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <Icon size={20} />
              <span className="font-sans text-[10px] font-semibold tracking-widest uppercase">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

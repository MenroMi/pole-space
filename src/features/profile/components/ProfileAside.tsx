'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/profile', label: 'Overview' },
  { href: '/profile/progress', label: 'Progress' },
  { href: '/profile/favourite-moves', label: 'Favourite Moves' },
  { href: '/profile/settings', label: 'Settings' },
];

interface ProfileAsideProps {
  name: string | null;
  image: string | null;
}

export default function ProfileAside({ name, image }: ProfileAsideProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        {image ? (
          <Image
            src={image}
            alt={name ?? 'Avatar'}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-on-surface">
            {name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="truncate font-display font-semibold text-on-surface">{name ?? 'User'}</span>
      </div>
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === href
              ? 'bg-primary-container font-medium text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

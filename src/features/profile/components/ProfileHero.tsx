import { BadgeCheck, Share2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type ProfileHeroProps = {
  name: string | null;
  image: string | null;
  location: string | null;
  createdAt: Date;
};

export default function ProfileHero({ name, image, location, createdAt }: ProfileHeroProps) {
  const joinYear = createdAt.getFullYear();
  const meta = location ? `${location} • Joined ${joinYear}` : `Joined ${joinYear}`;

  return (
    <section className="flex flex-col items-start gap-8 pt-8 md:flex-row md:items-end">
      {/* Avatar */}
      <div className="relative shrink-0 group">
        <div className="relative z-10 h-32 w-32 overflow-hidden rounded-full bg-surface-container ring-1 ring-outline-variant/20 md:h-40 md:w-40">
          {image ? (
            <Image
              src={image}
              alt={name ?? 'Avatar'}
              fill
              className="object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <User size={56} aria-hidden="true" />
            </div>
          )}
        </div>
        {/* Ambient glow */}
        <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-primary/20 opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80" />
      </div>

      {/* Name + badge + meta */}
      <div className="flex-1 space-y-2">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1 text-xs uppercase tracking-widest text-on-secondary-container ring-1 ring-outline-variant/15">
          <BadgeCheck size={16} aria-hidden="true" />
          Elite Member
        </div>
        <h1 className="font-display text-4xl font-bold lowercase tracking-tighter text-on-surface md:text-6xl">
          {name ?? 'anonymous'}
        </h1>
        <p className="text-lg text-on-surface-variant">{meta}</p>
      </div>

      {/* Action buttons */}
      <div className="hidden items-center gap-4 lg:flex">
        <button
          type="button"
          aria-label="Share profile"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high text-on-surface transition-colors hover:bg-surface-highest hover:text-primary"
        >
          <Share2 size={20} aria-hidden="true" />
        </button>
        <Link
          href="/profile/settings"
          className="kinetic-gradient cursor-pointer rounded-lg px-8 py-4 font-display text-sm font-semibold lowercase tracking-wide text-on-primary-container active:scale-95"
        >
          edit profile
        </Link>
      </div>
    </section>
  );
}

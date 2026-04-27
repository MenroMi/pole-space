import { BadgeCheck, Share2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type ProfileHeroProps = {
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  location: string | null;
  createdAt: Date;
};

export default function ProfileHero({
  firstName,
  lastName,
  image,
  location,
  createdAt,
}: ProfileHeroProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'anonymous';
  const joinYear = createdAt.getFullYear();
  const meta = location ? `${location} • Joined ${joinYear}` : `Joined ${joinYear}`;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-outline-variant/40 p-10 md:p-12"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #16101e 50%, #2b1545 100%)',
      }}
    >
      {/* Radial violet glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 right-[-10%] h-[500px] w-[500px] rounded-full blur-[80px]"
        style={{
          background: 'radial-gradient(circle, rgba(220,184,255,0.18), transparent 60%)',
        }}
      />

      <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-end">
        {/* Avatar */}
        <div className="group relative shrink-0">
          <div className="relative z-10 h-32 w-32 overflow-hidden rounded-2xl bg-surface-container ring-1 ring-outline-variant/20 md:h-40 md:w-40">
            {image ? (
              <Image src={image} alt={displayName} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                <User size={56} aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="absolute inset-0 -z-10 scale-110 rounded-2xl bg-primary/20 opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80" />
        </div>

        {/* Name + badge + meta */}
        <div className="flex-1 space-y-2">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1 text-xs tracking-widest text-on-secondary-container uppercase ring-1 ring-outline-variant/15">
            <BadgeCheck size={16} aria-hidden="true" />
            Elite Member
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tighter text-on-surface lowercase md:text-6xl">
            {displayName}
          </h1>
          <p className="text-lg text-on-surface-variant">{meta}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Share profile"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high text-on-surface transition-colors hover:bg-surface-highest hover:text-primary"
          >
            <Share2 size={20} aria-hidden="true" />
          </button>
          <Link
            href="/profile/settings"
            className="kinetic-gradient cursor-pointer rounded-lg px-8 py-4 font-display text-sm font-semibold tracking-wide text-on-primary-container lowercase transition-transform duration-150 active:scale-95"
          >
            edit profile
          </Link>
        </div>
      </div>
    </section>
  );
}

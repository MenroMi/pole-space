import { Settings, User } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

type ProfileHeroProps = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
  location: string | null;
  createdAt: Date;
};

export default async function ProfileHero({
  firstName,
  lastName,
  username,
  image,
  location,
  createdAt,
}: ProfileHeroProps) {
  const t = await getTranslations('profile');
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || t('anonymous');
  const joinYear = createdAt.getFullYear();

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-outline-variant/40 p-5 sm:p-10 md:p-12"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #16101e 50%, #2b1545 100%)',
      }}
    >
      {/* Primary glow — top right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/3 right-[-10%] h-[500px] w-[500px] rounded-full blur-[80px]"
        style={{
          background: 'radial-gradient(circle, rgba(220,184,255,0.18), transparent 60%)',
        }}
      />
      {/* Secondary glow — bottom left, desktop depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-40%] left-[-5%] hidden h-[280px] w-[280px] rounded-full blur-[60px] md:block"
        style={{
          background: 'radial-gradient(circle, rgba(132,88,179,0.22), transparent 70%)',
        }}
      />
      {/* Dot grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(220,184,255,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex flex-row gap-4 sm:flex-row sm:gap-8 md:items-end">
        {/* Avatar */}
        <div className="group relative shrink-0">
          <div className="relative z-10 h-[70px] w-[70px] overflow-hidden rounded-[13px] bg-surface-container ring-1 ring-outline-variant/20 sm:h-32 sm:w-32 md:h-40 md:w-40 md:rounded-[18px] md:ring-2 md:ring-primary/20">
            {image ? (
              <Image src={image} alt={displayName} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                <User className="h-8 w-8 sm:h-14 sm:w-14" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="absolute inset-0 -z-10 scale-110 rounded-2xl bg-primary/20 opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-90 md:scale-125 md:blur-3xl" />
        </div>

        {/* Name + meta + settings */}
        <div className="flex flex-1 flex-col gap-1">
          {location && (
            <p className="font-sans text-[10px] font-semibold tracking-[0.18em] text-primary uppercase md:text-[11px]">
              {location}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface capitalize sm:text-4xl md:text-[60px] md:leading-none md:tracking-[-0.03em]">
            {displayName}
          </h1>
          <p className="font-sans text-[11px] text-on-surface-variant sm:text-sm md:mt-1">
            {username ? `@${username} · ` : ''}
            {t('joinedYear', { year: joinYear })}
          </p>
          <div className="mt-2 flex justify-end sm:justify-start md:mt-4">
            <Link
              href="/profile/settings"
              aria-label={t('heroSettingsLabel')}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant/60 bg-transparent px-3 py-1.5 font-sans text-[12px] font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/[0.06] hover:text-on-surface md:gap-2 md:px-4 md:py-2 md:text-sm"
            >
              <Settings size={12} className="md:hidden" aria-hidden="true" />
              <Settings size={14} className="hidden md:block" aria-hidden="true" />
              {t('settings')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

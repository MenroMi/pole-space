import { Award, CheckCircle2, Heart, Rotate3D } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

type ProfileStatsProps = {
  masteredCount: number;
  inProgressCount: number;
  favouritesCount: number;
  currentStreak: number;
  longestStreak: number;
};

type StatCardProps = {
  icon: ReactNode;
  value: string | number;
  label: string;
  subtitle?: string;
};

function StatCard({ icon, value, label, subtitle }: StatCardProps) {
  return (
    <div className="group flex flex-col justify-between bg-surface-low p-[18px_16px] transition-colors hover:bg-surface-container sm:p-6 md:p-8">
      <div className="mb-3 text-primary/50 transition-colors group-hover:text-primary sm:mb-6">
        <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-125 [&>svg]:h-[22px] [&>svg]:w-[22px] sm:[&>svg]:h-8 sm:[&>svg]:w-8">
          {icon}
        </span>
      </div>
      <div>
        <p className="mb-1 font-display text-[28px] font-bold text-on-surface sm:text-4xl md:text-5xl">
          {value}
        </p>
        <p className="mt-1 text-[9px] tracking-[0.12em] text-on-surface-variant uppercase sm:text-xs">
          {label}
        </p>
        {subtitle && (
          <p className="mt-0.5 font-sans text-[10px] text-on-surface-variant/60 sm:text-xs">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function ProfileStats({
  masteredCount,
  inProgressCount,
  favouritesCount,
  currentStreak,
  longestStreak,
}: ProfileStatsProps) {
  const t = await getTranslations('profile');
  const te = await getTranslations('enums');

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-outline-variant/30 bg-outline-variant/30 xl:grid-cols-4">
      <StatCard
        icon={<CheckCircle2 size={32} aria-hidden="true" />}
        value={masteredCount}
        label={t('movesMastered')}
      />
      <StatCard
        icon={<Rotate3D size={32} aria-hidden="true" />}
        value={inProgressCount}
        label={te('learnStatus.IN_PROGRESS')}
      />
      <StatCard
        icon={<Heart size={32} aria-hidden="true" />}
        value={favouritesCount}
        label={t('favourites')}
      />
      <StatCard
        icon={<Award size={32} aria-hidden="true" />}
        value={currentStreak}
        label={t('trainingSessions')}
      />
    </div>
  );
}

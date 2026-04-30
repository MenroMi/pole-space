import { Award, CheckCircle2, Heart, Rotate3D } from 'lucide-react';
import type { ReactNode } from 'react';

type ProfileStatsProps = {
  masteredCount: number;
  inProgressCount: number;
  favouritesCount: number;
};

type StatCardProps = {
  icon: ReactNode;
  value: string | number;
  label: string;
};

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div
      className="flex flex-col justify-between rounded-lg border border-outline-variant/20 bg-surface-container p-6 md:p-[22px]"
      style={{ minHeight: 130 }}
    >
      <span className="inline-flex text-primary/50">{icon}</span>
      <div>
        <p className="font-display text-4xl leading-none font-bold tracking-[-0.02em] text-on-surface">
          {value}
        </p>
        <p className="mt-2 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
          {label}
        </p>
      </div>
    </div>
  );
}

export default function ProfileStats({
  masteredCount,
  inProgressCount,
  favouritesCount,
}: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4 xl:gap-[14px]">
      <StatCard
        icon={<CheckCircle2 size={28} aria-hidden="true" />}
        value={masteredCount}
        label="Moves Mastered"
      />
      <StatCard
        icon={<Rotate3D size={28} aria-hidden="true" />}
        value={inProgressCount}
        label="In Progress"
      />
      <StatCard
        icon={<Heart size={28} aria-hidden="true" />}
        value={favouritesCount}
        label="Favourites"
      />
      <StatCard icon={<Award size={28} aria-hidden="true" />} value="—" label="Training Sessions" />
    </div>
  );
}

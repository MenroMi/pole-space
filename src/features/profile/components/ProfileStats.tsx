import { Award, CheckCircle2, Flame, Heart } from 'lucide-react';
import type { ReactNode } from 'react';

type ProfileStatsProps = {
  masteredCount: number;
  favouritesCount: number;
};

type StatCardProps = {
  icon: ReactNode;
  value: string | number;
  label: string;
};

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="group flex flex-col justify-between bg-surface-low p-6 transition-colors hover:bg-surface-container md:p-8">
      <div className="mb-6 text-primary/50 transition-colors group-hover:text-primary">
        <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-125">
          {icon}
        </span>
      </div>
      <div>
        <p className="mb-2 font-display text-4xl font-bold text-on-surface md:text-5xl">{value}</p>
        <p className="text-xs tracking-widest text-on-surface-variant uppercase">{label}</p>
      </div>
    </div>
  );
}

export default function ProfileStats({ masteredCount, favouritesCount }: ProfileStatsProps) {
  return (
    <div className="relative">
      <section
        className="pointer-events-none grid grid-cols-1 gap-4 blur-sm select-none xl:grid-cols-4 xl:gap-6"
        aria-hidden="true"
      >
        <StatCard
          icon={<CheckCircle2 size={32} aria-hidden="true" />}
          value={masteredCount}
          label="Moves Mastered"
        />
        <StatCard
          icon={<Heart size={32} aria-hidden="true" />}
          value={favouritesCount}
          label="Favourites"
        />
        <StatCard icon={<Flame size={32} aria-hidden="true" />} value="—" label="Current Streak" />
        <StatCard icon={<Award size={32} aria-hidden="true" />} value="—" label="Skill Tier" />
      </section>

      <p
        aria-label="Stats — coming soon"
        className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold tracking-[0.3em] text-on-surface-variant uppercase"
      >
        Coming soon
      </p>
    </div>
  );
}

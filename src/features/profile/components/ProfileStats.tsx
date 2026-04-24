import { Award, CheckCircle2, Flame, Heart } from 'lucide-react';

type ProfileStatsProps = {
  masteredCount: number;
  favouritesCount: number;
};

type StatCardProps = {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  colSpan?: boolean;
};

function StatCard({ icon, value, label, colSpan }: StatCardProps) {
  return (
    <div
      className={`group flex flex-col justify-between bg-surface-low p-6 transition-colors hover:bg-surface-container md:p-8 ${colSpan ? 'col-span-2 md:col-span-1' : ''}`}
    >
      <div className="mb-6 text-primary/50 transition-colors group-hover:text-primary">{icon}</div>
      <div>
        <p className="mb-2 font-display text-4xl font-bold text-on-surface md:text-5xl">{value}</p>
        <p className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}

export default function ProfileStats({ masteredCount, favouritesCount }: ProfileStatsProps) {
  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      <StatCard
        icon={<CheckCircle2 size={32} aria-hidden="true" />}
        value={masteredCount}
        label="Moves Mastered"
      />
      <StatCard
        icon={<Heart size={32} aria-hidden="true" />}
        value={favouritesCount}
        label="Favorites"
      />
      <StatCard
        icon={<Flame size={32} aria-hidden="true" />}
        value="—"
        label="Current Streak"
        colSpan
      />
      <StatCard
        icon={<Award size={32} aria-hidden="true" />}
        value="—"
        label="Skill Tier"
        colSpan
      />
    </section>
  );
}

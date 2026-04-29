import type { Move } from '@prisma/client';

import { formatPoleTypes } from '../utils';

type MoveSpecsProps = Pick<Move, 'gripType' | 'entry' | 'duration' | 'poleTypes'>;
type SpecItem = { label: string; value: string };

function SpecCard({ label, value }: SpecItem) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-outline-variant/15 bg-surface-lowest p-6">
      <dt className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {label}
      </dt>
      <dd className="font-display text-lg text-on-surface">{value}</dd>
    </div>
  );
}

export default function MoveSpecs({ gripType, entry, duration, poleTypes }: MoveSpecsProps) {
  const raw: { label: string; value: string | null | undefined }[] = [
    { label: 'Grip Type', value: gripType },
    { label: 'Entry', value: entry },
    { label: 'Duration', value: duration },
    { label: 'Pole Setting', value: formatPoleTypes(poleTypes) },
  ];
  const specs: SpecItem[] = raw.filter((s): s is SpecItem => s.value != null);

  if (specs.length === 0) return null;

  return (
    <section aria-label="Move specs">
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {specs.map(({ label, value }) => (
          <SpecCard key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

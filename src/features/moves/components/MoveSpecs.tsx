import type { Move, PoleType } from '@prisma/client';

type MoveSpecsProps = Pick<Move, 'gripType' | 'entry' | 'duration' | 'poleType'>;
type SpecItem = { label: string; value: string };

const POLE_TYPE_LABEL: Record<PoleType, string> = {
  STATIC: 'Static',
  SPIN: 'Spin',
};

function SpecCard({ label, value }: SpecItem) {
  return (
    <div className="bg-surface-container-lowest flex flex-col gap-2 rounded-lg border border-outline-variant/15 p-6">
      <dt className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {label}
      </dt>
      <dd className="font-display text-lg text-on-surface">{value}</dd>
    </div>
  );
}

export default function MoveSpecs({ gripType, entry, duration, poleType }: MoveSpecsProps) {
  const raw: { label: string; value: string | null | undefined }[] = [
    { label: 'Grip Type', value: gripType },
    { label: 'Entry', value: entry },
    { label: 'Duration', value: duration },
    {
      label: 'Pole Setting',
      value: poleType ? POLE_TYPE_LABEL[poleType] : null,
    },
  ];
  const specs: SpecItem[] = raw.filter((s): s is SpecItem => s.value != null);

  if (specs.length === 0) return null;

  return (
    <section aria-label="Move specs">
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {specs.map(({ label, value }) => (
          <div key={label}>
            <SpecCard label={label} value={value} />
          </div>
        ))}
      </dl>
    </section>
  );
}

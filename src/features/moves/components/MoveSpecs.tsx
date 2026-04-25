import type { Move } from '@prisma/client';

type MoveSpecsProps = Pick<Move, 'gripType' | 'entry' | 'duration' | 'poleType'>;
type SpecItem = { label: string; value: string };

function SpecCard({ label, value }: SpecItem) {
  return (
    <div className="bg-surface-container-lowest flex flex-col gap-2 rounded-lg border border-outline-variant/15 p-6">
      <span className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {label}
      </span>
      <span className="font-display text-lg text-on-surface">{value}</span>
    </div>
  );
}

export default function MoveSpecs({ gripType, entry, duration, poleType }: MoveSpecsProps) {
  const specs: SpecItem[] = (
    [
      { label: 'Grip Type', value: gripType },
      { label: 'Entry', value: entry },
      { label: 'Duration', value: duration },
      {
        label: 'Pole Setting',
        value: poleType ? poleType.charAt(0) + poleType.slice(1).toLowerCase() : null,
      },
    ] as { label: string; value: string | null | undefined }[]
  ).filter((s): s is SpecItem => s.value != null);

  if (specs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {specs.map(({ label, value }) => (
        <SpecCard key={label} label={label} value={value} />
      ))}
    </div>
  );
}

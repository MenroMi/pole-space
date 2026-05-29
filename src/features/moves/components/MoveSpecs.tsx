'use client';
import { useTranslations } from 'next-intl';

import type { LocalizedMove } from '@/shared/lib/localize';

type MoveSpecsProps = Pick<LocalizedMove, 'gripType' | 'entry' | 'duration' | 'poleTypes'>;
type SpecItem = { label: string; value: string };

function SpecCard({ label, value }: SpecItem) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-outline-variant/15 bg-surface-lowest p-3 sm:gap-2 sm:p-6">
      <dt className="font-sans text-[9px] tracking-widest text-on-surface-variant uppercase sm:text-[10px]">
        {label}
      </dt>
      <dd className="font-display text-sm text-on-surface sm:text-lg">{value}</dd>
    </div>
  );
}

export default function MoveSpecs({ gripType, entry, duration, poleTypes }: MoveSpecsProps) {
  const t = useTranslations('moves');
  const te = useTranslations('enums');

  const poleTypeValue =
    poleTypes.length === 0
      ? null
      : poleTypes.length === 2
        ? `${te('poleType.STATIC')} & ${te('poleType.SPIN')}`
        : te(`poleType.${poleTypes[0]}`);

  const raw: { label: string; value: string | null | undefined }[] = [
    { label: t('gripType'), value: gripType },
    { label: t('entry'), value: entry },
    { label: t('duration'), value: duration },
    { label: t('poleSetting'), value: poleTypeValue },
  ];
  const specs: SpecItem[] = raw.filter((s): s is SpecItem => s.value != null);

  if (specs.length === 0) return null;

  return (
    <section aria-label={t('specs')} className="mt-6 pb-3 sm:mt-8 sm:pb-4">
      <p className="mb-2 font-sans text-[9px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase sm:mb-3 sm:text-[10px]">
        {t('specs')}
      </p>
      <dl className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
        {specs.map(({ label, value }) => (
          <SpecCard key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

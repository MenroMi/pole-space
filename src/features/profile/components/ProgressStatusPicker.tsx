'use client';
import type { LearnStatus } from '@/shared/types';

const STATUSES: { value: LearnStatus; label: string }[] = [
  { value: 'WANT_TO_LEARN', label: 'Want to Learn' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'LEARNED', label: 'Learned' },
];

type ProgressStatusPickerProps = {
  currentStatus: LearnStatus;
  onStatusChange: (status: LearnStatus) => void;
  isPending: boolean;
};

export default function ProgressStatusPicker({
  currentStatus,
  onStatusChange,
  isPending,
}: ProgressStatusPickerProps) {
  const activeIndex = STATUSES.findIndex((s) => s.value === currentStatus);

  return (
    <div className="relative flex rounded-lg border border-outline-variant/30 bg-[#0e0e0e] p-1">
      <div
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-md bg-gradient-to-br from-[#dcb8ff] via-[#8458b3] to-[#dcb8ff] transition-transform duration-300 ease-out"
        style={{
          width: 'calc((100% - 8px) / 3)',
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />
      {STATUSES.map(({ value, label }) => {
        const active = currentStatus === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onStatusChange(value)}
            disabled={isPending || active}
            aria-pressed={active}
            className={`relative z-10 flex-1 cursor-pointer rounded-md px-3 py-2 font-sans text-xs font-semibold transition-colors duration-200 disabled:cursor-default ${
              active ? 'text-[#f8ebff]' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

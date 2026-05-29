'use client';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState } from 'react';

import type { LearnStatus } from '@/shared/types';

const STATUS_VALUES: LearnStatus[] = ['WANT_TO_LEARN', 'IN_PROGRESS', 'LEARNED'];

type ProgressStatusPickerProps = {
  currentStatus: LearnStatus | null;
  onStatusChange: (status: LearnStatus | null) => void;
  isPending: boolean;
};

type PillGeometry = { left: number; width: number };

export default function ProgressStatusPicker({
  currentStatus,
  onStatusChange,
  isPending,
}: ProgressStatusPickerProps) {
  const te = useTranslations('enums');
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = STATUS_VALUES.indexOf(currentStatus as LearnStatus);
  const hasActive = activeIndex !== -1;
  const [pill, setPill] = useState<PillGeometry | null>(null);

  // Sync pill position when status changes, container resizes, or viewport changes.
  // ResizeObserver covers fluid parent layouts (e.g. flex-1 inside a grid that reflows
  // at the lg breakpoint); without it the pill keeps stale pixel geometry on resize.
  useLayoutEffect(() => {
    if (!containerRef.current || !hasActive) {
      setPill(null);
      return;
    }
    const container = containerRef.current;
    function measure() {
      const buttons = container.querySelectorAll<HTMLButtonElement>('button');
      const btn = buttons[activeIndex];
      if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [hasActive, activeIndex]);

  function handleChange(status: LearnStatus | null, el: HTMLButtonElement) {
    if (status !== null) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    onStatusChange(status);
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full rounded-lg border border-outline-variant/30 bg-[#0e0e0e] p-1"
    >
      <div
        aria-hidden="true"
        className={`absolute top-1 bottom-1 rounded-md bg-gradient-to-br from-[#dcb8ff] via-[#8458b3] to-[#dcb8ff] transition-[left,width,opacity] duration-300 ease-out ${
          hasActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: pill?.left, width: pill?.width }}
      />
      {STATUS_VALUES.map((value, i) => {
        const active = currentStatus === value;
        return (
          <button
            data-index={`progress-pill-${i}`}
            key={value}
            type="button"
            onClick={(e) => handleChange(active ? null : value, e.currentTarget)}
            disabled={isPending}
            aria-pressed={active}
            className={`relative z-10 cursor-pointer rounded-md px-3 py-2 font-sans text-xs font-semibold transition-colors duration-200 disabled:cursor-default sm:text-sm ${
              active ? 'text-[#f8ebff]' : 'text-on-surface-variant hover:text-on-surface'
            } flex-1`}
          >
            {te(`learnStatus.${value}`)}
          </button>
        );
      })}
    </div>
  );
}

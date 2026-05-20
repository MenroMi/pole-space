'use client';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import type { LearnStatus } from '@/shared/types';

import type { ProgressWithMove } from '../types';

const STATUS_STRIP: LearnStatus[] = ['WANT_TO_LEARN', 'IN_PROGRESS', 'LEARNED'];

const DIFF_COLORS: Record<string, { bg: string; fg: string }> = {
  BEGINNER: { bg: 'rgba(132,88,179,0.15)', fg: '#c5afe2' },
  INTERMEDIATE: { bg: 'rgba(220,184,255,0.15)', fg: '#dcb8ff' },
  ADVANCED: { bg: 'rgba(146,64,14,0.22)', fg: '#fcd9a0' },
};

type ProgressCardProps = {
  item: ProgressWithMove;
  onStatusChange: (moveId: string, status: LearnStatus | null) => void;
  isPending: boolean;
};

export default function ProgressCard({ item, onStatusChange, isPending }: ProgressCardProps) {
  const te = useTranslations('enums');
  const diff = DIFF_COLORS[item.move.difficulty] ?? DIFF_COLORS.BEGINNER;

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/[0.18] bg-surface-container">
      {/* Top row */}
      <div className="flex gap-[11px] p-[13px]">
        {/* Thumbnail */}
        <div className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-outline-variant/20 bg-surface-low">
          {item.move.imageUrl ? (
            <Image src={item.move.imageUrl} alt={item.move.title} fill className="object-cover" />
          ) : (
            <Play size={16} style={{ color: 'rgba(220,184,255,0.4)' }} aria-hidden="true" />
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-[3px] flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-[13px] font-semibold text-on-surface sm:text-sm md:text-base">
              {item.move.title}
            </h3>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 font-sans text-[9px] font-bold sm:text-[11px]"
              style={{ background: diff.bg, color: diff.fg }}
            >
              {te(`difficulty.${item.move.difficulty}`)}
            </span>
          </div>
          <p className="font-sans text-[11px] text-on-surface-variant/70 italic sm:text-xs md:text-sm">
            {item.move.category}
          </p>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex" style={{ borderTop: '1px solid rgba(75,68,80,0.12)' }}>
        {STATUS_STRIP.map((value, i) => {
          const active = item.status === value;
          return (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => onStatusChange(item.moveId, active ? null : value)}
              aria-pressed={active}
              className="flex-1 cursor-pointer border-0 py-[7px] text-center font-sans text-[9px] transition-colors disabled:cursor-default sm:text-[11px] md:text-xs"
              style={{
                background: active ? 'rgba(220,184,255,0.06)' : 'transparent',
                color: active ? '#dcb8ff' : '#6b6270',
                fontWeight: active ? 700 : 400,
                borderRight:
                  i < STATUS_STRIP.length - 1 ? '1px solid rgba(75,68,80,0.12)' : undefined,
              }}
            >
              {te(`learnStatus.${value}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

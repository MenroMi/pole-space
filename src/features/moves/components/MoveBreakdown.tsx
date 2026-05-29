'use client';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StepItem } from '../types';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MoveBreakdown({
  stepsData,
  onSeek,
  coachNote,
  coachNoteAuthor,
}: {
  stepsData: StepItem[];
  onSeek: (seconds: number) => void;
  coachNote: string | null;
  coachNoteAuthor: string | null;
}) {
  const t = useTranslations('moves');

  if (stepsData.length === 0) return null;

  return (
    <div className={`grid gap-8 ${coachNote ? 'lg:grid-cols-[2fr_1fr]' : ''}`}>
      <div className="flex flex-col gap-3">
        {stepsData.map((step, index) => (
          <div key={index} className="flex gap-3.5 rounded-xl bg-surface-container p-4">
            {/* Circle number badge */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#dcb8ff] via-[#8458b3] to-[#3b1a78] font-sans text-xs font-bold text-white">
              {index + 1}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="font-sans text-sm leading-relaxed text-on-surface-variant">
                    {step.text}
                  </p>
                </div>
                {step.timestamp != null && (
                  <button
                    type="button"
                    onClick={() => onSeek(step.timestamp!)}
                    aria-label={t('seekTo', { time: formatTimestamp(step.timestamp) })}
                    className="hover:bg-surface-container-high flex shrink-0 cursor-pointer items-center gap-1 rounded px-2 py-1 font-sans text-xs text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
                  >
                    <Play size={10} fill="currentColor" aria-hidden="true" />
                    {formatTimestamp(step.timestamp)}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {coachNote && (
        <aside
          style={{ background: 'rgba(132, 88, 179, 0.07)' }}
          className="self-start rounded-xl border border-primary/20 p-5 lg:p-6"
        >
          <p className="mb-3 font-sans text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
            {t('coachNote')}
          </p>
          <p className="font-sans text-sm leading-relaxed text-on-surface italic">
            &ldquo;{coachNote}&rdquo;
          </p>
          {coachNoteAuthor && (
            <p className="mt-3 font-sans text-[11px] text-outline">— {coachNoteAuthor}</p>
          )}
        </aside>
      )}
    </div>
  );
}

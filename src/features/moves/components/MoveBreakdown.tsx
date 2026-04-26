'use client';
import { Play } from 'lucide-react';

import type { StepItem } from '../types';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MoveBreakdown({
  stepsData,
  onSeek,
}: {
  stepsData: StepItem[];
  onSeek: (seconds: number) => void;
}) {
  if (stepsData.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-xl p-8">
      <div className="space-y-6">
        {stepsData.map((step, index) => (
          <div
            key={index}
            className="group hover:bg-surface-container-highest -mx-4 flex gap-6 rounded-lg p-4 transition-colors"
          >
            <div className="shrink-0 font-display text-4xl font-bold text-outline-variant opacity-50 transition-colors group-hover:text-primary group-hover:opacity-100">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <p className="font-sans leading-relaxed text-on-surface">{step.text}</p>
              {step.timestamp != null && (
                <button
                  type="button"
                  onClick={() => onSeek(step.timestamp!)}
                  aria-label={`Seek to ${formatTimestamp(step.timestamp)}`}
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-1 font-sans text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <Play size={10} fill="currentColor" aria-hidden="true" />
                  {formatTimestamp(step.timestamp)}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

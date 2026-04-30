'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { extractVideoId } from '@/features/moves/lib/youtube';
import type { LearnStatus } from '@/shared/types';

import type { ProgressWithMove } from '../types';

import ProgressStatusPicker from './ProgressStatusPicker';

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

function ThumbImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 120) setFailed(true);
      }}
      onError={() => setFailed(true)}
    />
  );
}

type LearnedCardProps = {
  item: ProgressWithMove;
  onStatusChange: (moveId: string, status: LearnStatus | null) => void;
  isPending: boolean;
};

export default function LearnedCard({ item, onStatusChange, isPending }: LearnedCardProps) {
  const badge = DIFFICULTY_BADGE[item.move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;
  const videoId = extractVideoId(item.move.youtubeUrl);
  const thumb =
    item.move.imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  return (
    <div className="group overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container transition-all duration-240 hover:border-primary/35">
      <Link
        href={`/moves/${item.moveId}`}
        className="relative block transition-transform duration-200 hover:-translate-y-[2px]"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          {thumb ? (
            <ThumbImage src={thumb} alt={item.move.title} />
          ) : (
            <div className="to-surface-container-highest flex h-full w-full items-center justify-center bg-linear-to-br from-surface-container">
              <span className="font-display text-5xl font-semibold text-primary/20">
                {item.move.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start bg-linear-to-b from-surface/70 to-transparent p-3">
            <span
              className={`rounded-full px-3 py-1 font-sans text-[10px] font-bold tracking-[0.16em] uppercase ${badge.className}`}
              style={badge.style}
            >
              {item.move.difficulty.charAt(0) + item.move.difficulty.slice(1).toLowerCase()}
            </span>
          </div>
        </div>

        <div className="px-3.5 pt-3.5 pb-2">
          <h3 className="font-display text-base font-semibold tracking-tight text-on-surface lowercase">
            {item.move.title.toLowerCase()}
          </h3>
        </div>
      </Link>

      <div className="px-3.5 pb-3.5">
        <ProgressStatusPicker
          currentStatus={item.status}
          onStatusChange={(status) => onStatusChange(item.moveId, status)}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

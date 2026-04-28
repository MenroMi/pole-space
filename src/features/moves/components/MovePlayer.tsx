'use client';
import type { Difficulty, PoleType } from '@prisma/client';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type { Category, LearnStatus } from '@/shared/types';

import type { StepItem } from '../types';

import MoveFavouriteButton from './MoveFavouriteButton';
import MoveHero from './MoveHero';
import { MoveProgressPicker } from './MoveProgressPicker';
import MoveSpecs from './MoveSpecs';
import MoveTabs from './MoveTabs';

const DIFFICULTY_BADGE: Record<Difficulty, { className: string; style?: CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

function formatLabel(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

type MovePlayerProps = {
  title: string;
  youtubeUrl: string;
  imageUrl: string | null;
  stepsData: StepItem[];
  difficulty: Difficulty;
  description: string | null;
  category: Category;
  poleType: PoleType | null;
  moveId: string;
  isFavourited: boolean;
  isAuthenticated: boolean;
  currentProgress: LearnStatus | null;
  gripType: string | null;
  entry: string | null;
  duration: string | null;
};

export default function MovePlayer({
  title,
  youtubeUrl,
  imageUrl,
  stepsData,
  difficulty,
  description,
  category,
  poleType,
  moveId,
  isFavourited,
  isAuthenticated,
  currentProgress,
  gripType,
  entry,
  duration,
}: MovePlayerProps) {
  const [seekRequest, setSeekRequest] = useState<{ seconds: number } | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  function handleSeek(seconds: number) {
    const request = { seconds };
    if (window.scrollY === 0) {
      setSeekRequest(request);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // 400ms matches the browser's smooth-scroll animation duration
      scrollTimerRef.current = setTimeout(() => setSeekRequest(request), 400);
    }
  }

  const badge = DIFFICULTY_BADGE[difficulty];
  const difficultyLabel = formatLabel(difficulty);

  return (
    <div className="mx-auto max-w-[1280px] px-8 py-8">
      {/* Hero grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: video player */}
        <MoveHero
          title={title}
          youtubeUrl={youtubeUrl}
          imageUrl={imageUrl}
          seekRequest={seekRequest ?? undefined}
        />

        {/* Right: info panel */}
        <div className="flex flex-col gap-5">
          {/* Difficulty chip */}
          <span
            className={`w-fit rounded-full px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase ${badge.className}`}
            style={badge.style}
          >
            {difficultyLabel}
          </span>

          {/* Title */}
          <h1 className="font-display text-[64px] leading-[0.95] font-semibold tracking-[-0.04em] text-on-surface lowercase">
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="font-sans text-base leading-relaxed text-on-surface-variant">
              {description}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-outline-variant/30 px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
              {formatLabel(category)}
            </span>
            {poleType && (
              <span className="rounded-full border border-outline-variant/30 px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
                {formatLabel(poleType)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            <MoveFavouriteButton
              moveId={moveId}
              isFavourited={isFavourited}
              isAuthenticated={isAuthenticated}
            />
            {isAuthenticated && (
              <div className="flex-1">
                <MoveProgressPicker moveId={moveId} initialStatus={currentProgress} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Specs — full width below the grid */}
      <MoveSpecs gripType={gripType} entry={entry} duration={duration} poleType={poleType} />

      {/* Tabs — full width below specs */}
      <div className="mt-10">
        <MoveTabs stepsData={stepsData} onSeek={handleSeek} />
      </div>
    </div>
  );
}

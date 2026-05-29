'use client';
import type { Difficulty, PoleType } from '@prisma/client';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Link } from '@/i18n/navigation';
import type { LocalizedTag } from '@/shared/lib/localize';
import type { LearnStatus } from '@/shared/types';

import type { StepItem } from '../types';

import MoveBreakdown from './MoveBreakdown';
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

type MovePlayerProps = {
  title: string;
  category: string;
  youtubeUrl: string;
  imageUrl: string | null;
  stepsData: StepItem[];
  difficulty: Difficulty;
  description: string | null;
  tags: LocalizedTag[];
  poleTypes: PoleType[];
  moveId: string;
  isFavourited: boolean;
  isAuthenticated: boolean;
  currentProgress: LearnStatus | null;
  gripType: string | null;
  entry: string | null;
  duration: string | null;
  coachNote: string | null;
  coachNoteAuthor: string | null;
};

export default function MovePlayer({
  title,
  category,
  youtubeUrl,
  imageUrl,
  stepsData,
  difficulty,
  description,
  tags,
  poleTypes,
  moveId,
  isFavourited,
  isAuthenticated,
  currentProgress,
  gripType,
  entry,
  duration,
  coachNote,
  coachNoteAuthor,
}: MovePlayerProps) {
  const t = useTranslations('moves');
  const te = useTranslations('enums');
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
      scrollTimerRef.current = setTimeout(() => setSeekRequest(request), 400);
    }
  }

  const badge = DIFFICULTY_BADGE[difficulty];
  const difficultyLabel = te(`difficulty.${difficulty}`);
  const categoryLabel = te(`category.${category}`);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-3 pb-8 sm:px-8 sm:py-8">
      {/* Mobile page header: ← title ♡ */}
      <div className="mb-3 flex items-center gap-2 sm:hidden">
        <Link
          href="/catalog"
          aria-label={t('backToCatalog')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <p className="flex-1 truncate font-display text-[17px] font-semibold tracking-[-0.02em] text-on-surface lowercase">
          {title}
        </p>
        <MoveFavouriteButton
          moveId={moveId}
          isFavourited={isFavourited}
          isAuthenticated={isAuthenticated}
          iconOnly
        />
      </div>

      {/* Hero grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        {/* Left: video player */}
        <MoveHero
          title={title}
          youtubeUrl={youtubeUrl}
          imageUrl={imageUrl}
          seekRequest={seekRequest ?? undefined}
        />

        {/* Right: info panel */}
        <div className="flex flex-col gap-5">
          {/* Difficulty chip — desktop only */}
          <span
            aria-label={difficultyLabel}
            className={`hidden w-fit rounded-full px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase sm:inline-flex ${badge.className}`}
            style={badge.style}
          >
            {difficultyLabel}
          </span>

          {/* Title — desktop only (mobile header has it) */}
          <h1 className="hidden font-display text-[28px] leading-[1.05] font-semibold tracking-[-0.04em] text-on-surface lowercase sm:block sm:text-[40px] sm:leading-[0.95] lg:text-[52px]">
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="font-sans text-base leading-relaxed text-on-surface-variant">
              {description}
            </p>
          )}

          {/* Mobile meta row: difficulty badge · first tag */}
          <div className="flex items-center gap-2 sm:hidden">
            <span
              className={`rounded-full px-2.5 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase ${badge.className}`}
              style={badge.style}
            >
              {difficultyLabel}
            </span>
            <span className="text-on-surface-variant/40" aria-hidden="true">
              ·
            </span>
            <span className="font-sans text-xs text-on-surface-variant">{categoryLabel}</span>
          </div>

          {/* Tags — desktop only */}
          {tags.length > 0 && (
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className={`rounded-full px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase ${
                    tag.color ? '' : 'border border-outline-variant/30 text-on-surface-variant'
                  }`}
                  style={
                    tag.color ? { backgroundColor: `${tag.color}28`, color: tag.color } : undefined
                  }
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            {/* Favourite button — desktop only (mobile header has icon-only version) */}
            <MoveFavouriteButton
              moveId={moveId}
              isFavourited={isFavourited}
              isAuthenticated={isAuthenticated}
            />
            {isAuthenticated ? (
              <div className="flex-1">
                <MoveProgressPicker moveId={moveId} initialStatus={currentProgress} />
              </div>
            ) : (
              <Link
                href="/login"
                className="h-full flex-1 rounded-lg border border-outline-variant/20 px-3 py-3 text-center font-sans text-xs font-semibold text-on-surface-variant transition-colors hover:border-outline-variant/40 hover:text-on-surface"
              >
                {t('loginToTrack')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <MoveSpecs gripType={gripType} entry={entry} duration={duration} poleTypes={poleTypes} />

      {/* Tabs */}
      <div className="mt-6 sm:mt-10">
        <MoveTabs
          breakdown={
            <MoveBreakdown
              stepsData={stepsData}
              onSeek={handleSeek}
              coachNote={coachNote}
              coachNoteAuthor={coachNoteAuthor}
            />
          }
        />
      </div>
    </div>
  );
}

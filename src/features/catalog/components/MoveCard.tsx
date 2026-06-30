'use client';
import { ImageOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { extractVideoId } from '@/features/moves/lib/youtube';
import { Link } from '@/i18n/navigation';

import type { LocalizedMoveWithTags } from '../types';

import MoveCardImage from './MoveCardImage';

const DIFFICULTY_BADGE: Record<string, { style: React.CSSProperties }> = {
  BEGINNER: { style: { backgroundColor: 'rgba(132,88,179,0.15)', color: 'rgb(197,175,226)' } },
  INTERMEDIATE: { style: { backgroundColor: 'rgba(220,184,255,0.15)', color: '#dcb8ff' } },
  ADVANCED: { style: { backgroundColor: 'rgba(146,64,14,0.22)', color: 'rgb(252,217,160)' } },
};

type MoveCardProps = { move: LocalizedMoveWithTags };

export default function MoveCard({ move }: MoveCardProps) {
  const te = useTranslations('enums');
  const badge = (DIFFICULTY_BADGE[move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER).style;

  const imageSrc: string | null =
    move.imageUrl ??
    (() => {
      const videoId = extractVideoId(move.youtubeUrl);
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    })();

  const visibleTags = move.tags.slice(0, 3);

  return (
    <Link
      href={`/moves/${move.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
    >
      {/* Image dominates the card (portrait on desktop, like the favourites gallery) */}
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-accent sm:aspect-[4/5]">
        {imageSrc ? (
          <MoveCardImage
            src={imageSrc}
            alt={move.title}
            focalX={move.focalX}
            focalY={move.focalY}
          />
        ) : (
          <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
        {/* Difficulty chip overlaid on the image with a top gradient for legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start bg-linear-to-b from-surface/70 to-transparent p-[8px] sm:p-3">
          <span
            className="rounded-full px-[9px] py-[3px] text-[11px] font-bold tracking-[0.05em] uppercase sm:px-2.5 sm:py-1 sm:text-xs"
            style={badge}
          >
            {te(`difficulty.${move.difficulty}`)}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-[11px] py-[9px] sm:p-4">
        <h3 className="truncate font-display text-[15px] font-semibold text-on-surface sm:text-lg">
          {move.title}
        </h3>
        {visibleTags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 overflow-hidden pt-[7px] sm:pt-2">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className="shrink-0 rounded-full px-[8px] py-[3px] text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs"
                style={
                  tag.color
                    ? { backgroundColor: `${tag.color}28`, color: tag.color }
                    : { backgroundColor: 'rgba(132,88,179,0.12)', color: 'rgb(197,175,226)' }
                }
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

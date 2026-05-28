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
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-accent">
        {imageSrc ? (
          <MoveCardImage src={imageSrc} alt={move.title} />
        ) : (
          <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(220,184,255,0.06), transparent 60%)',
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-[5px] px-[11px] py-[9px] sm:gap-2 sm:p-4">
        <span
          className="self-start rounded-full px-[8px] py-[3px] text-[9px] font-bold tracking-[0.05em] uppercase sm:px-2 sm:py-0.5 sm:text-[10px]"
          style={badge}
        >
          {te(`difficulty.${move.difficulty}`)}
        </span>
        <h3 className="truncate font-display text-[12px] font-semibold text-on-surface sm:text-sm">
          {move.title}
        </h3>
        {move.description && (
          <p className="line-clamp-2 hidden font-sans text-sm text-on-surface-variant sm:block">
            {move.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1 overflow-hidden">
          {visibleTags.map((tag) => (
            <span
              key={tag.id}
              className="shrink-0 rounded-full px-[6px] py-[2px] text-[9px] font-semibold sm:px-2 sm:py-0.5 sm:text-[10px]"
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
      </div>
    </Link>
  );
}

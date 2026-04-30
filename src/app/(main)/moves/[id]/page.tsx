import type { Difficulty } from '@prisma/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { CSSProperties } from 'react';

import {
  getMoveByIdAction,
  getRelatedMovesAction,
  MovePlayer,
  MoveFavouriteButton,
  MoveSpecs,
} from '@/features/moves';
import MoveBreadcrumb from '@/features/moves/components/MoveBreadcrumb';
import RelatedMoves from '@/features/moves/components/RelatedMoves';
import { extractVideoId } from '@/features/moves/lib/youtube';
import { formatPoleTypes } from '@/features/moves/utils';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

const DIFFICULTY_BADGE: Record<Difficulty, { className: string; style?: CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

export async function generateStaticParams() {
  try {
    const moves = await prisma.move.findMany({ select: { id: true }, take: 1000 });
    return moves.map((m) => ({ id: m.id }));
  } catch {
    return [];
  }
}

// cache() deduplicates this call within one request so generateMetadata
// and the page component share the same DB result.
const getMove = cache(getMoveByIdAction);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const move = await getMove(id, undefined);
  if (!move) return {};

  const videoId = extractVideoId(move.youtubeUrl);
  const image =
    move.imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
  const description = move.description ?? `Learn the ${move.title} pole dance move.`;

  return {
    title: `${move.title} | Pole Dance Catalog`,
    description,
    openGraph: {
      title: move.title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const move = await getMoveByIdAction(id, userId);

  if (!move) return notFound();

  const related = await getRelatedMovesAction(
    move.tags.map((t) => t.id),
    id,
  );

  const isFavourited = move.favourites.length > 0;
  const isAuthenticated = !!userId;
  const badge = DIFFICULTY_BADGE[move.difficulty];
  const difficultyLabel = move.difficulty.charAt(0) + move.difficulty.slice(1).toLowerCase();
  const poleTypeLabel = formatPoleTypes(move.poleTypes);

  return (
    <main>
      <MoveBreadcrumb category={move.category} moveName={move.title} />
      <MovePlayer
        title={move.title}
        youtubeUrl={move.youtubeUrl}
        imageUrl={move.imageUrl}
        stepsData={move.stepsData}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-4 font-display text-5xl font-bold tracking-tighter text-on-surface lowercase md:text-7xl">
              {move.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {poleTypeLabel && (
                <span className="rounded-full bg-secondary-container px-4 py-1 font-sans text-[10px] tracking-widest text-on-secondary-container uppercase">
                  {poleTypeLabel}
                </span>
              )}
              <span
                className={`rounded-full px-4 py-1 font-sans text-[10px] tracking-widest uppercase ${badge.className}`}
                style={badge.style}
              >
                {difficultyLabel}
              </span>
            </div>
          </div>
          <MoveFavouriteButton
            moveId={move.id}
            isFavourited={isFavourited}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <MoveSpecs
          gripType={move.gripType}
          entry={move.entry}
          duration={move.duration}
          poleTypes={move.poleTypes}
        />

        {move.description && (
          <p className="font-sans text-lg leading-relaxed text-on-surface-variant">
            {move.description}
          </p>
        )}
      </MovePlayer>
      <RelatedMoves moves={related} />
    </main>
  );
}

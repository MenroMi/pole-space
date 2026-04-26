import type { Difficulty } from '@prisma/client';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { getMoveByIdAction, MovePlayer, MoveFavouriteButton, MoveSpecs } from '@/features/moves';
import { auth } from '@/shared/lib/auth';

const DIFFICULTY_BADGE: Record<Difficulty, { className: string; style?: CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const move = await getMoveByIdAction(id, userId);

  if (!move) notFound();

  const isFavourited = move.favourites.length > 0;
  const isAuthenticated = !!userId;
  const badge = DIFFICULTY_BADGE[move.difficulty];
  const difficultyLabel = move.difficulty.charAt(0) + move.difficulty.slice(1).toLowerCase();
  const poleTypeLabel = move.poleType
    ? move.poleType.charAt(0) + move.poleType.slice(1).toLowerCase()
    : null;

  return (
    <main>
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
          poleType={move.poleType}
        />

        {move.description && (
          <p className="font-sans text-lg leading-relaxed text-on-surface-variant">
            {move.description}
          </p>
        )}
      </MovePlayer>
    </main>
  );
}

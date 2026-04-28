import { notFound } from 'next/navigation';

import { getMoveByIdAction, getRelatedMovesAction, MovePlayer, MoveSpecs } from '@/features/moves';
import MoveBreadcrumb from '@/features/moves/components/MoveBreadcrumb';
import RelatedMoves from '@/features/moves/components/RelatedMoves';
import { auth } from '@/shared/lib/auth';

export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const move = await getMoveByIdAction(id, userId);

  if (!move) return notFound();

  const related = await getRelatedMovesAction(move.category, id);

  const isFavourited = move.favourites.length > 0;
  const isAuthenticated = !!userId;

  return (
    <main>
      <MoveBreadcrumb category={move.category} moveName={move.title} />
      <MovePlayer
        title={move.title}
        youtubeUrl={move.youtubeUrl}
        imageUrl={move.imageUrl}
        stepsData={move.stepsData}
        difficulty={move.difficulty}
        description={move.description}
        category={move.category}
        poleType={move.poleType}
        moveId={move.id}
        isFavourited={isFavourited}
        isAuthenticated={isAuthenticated}
        currentProgress={move.currentProgress}
      />
      <MoveSpecs
        gripType={move.gripType}
        entry={move.entry}
        duration={move.duration}
        poleType={move.poleType}
      />
      <RelatedMoves moves={related} />
    </main>
  );
}

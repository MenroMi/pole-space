import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMoveByIdAction, getRelatedMovesAction, MovePlayer } from '@/features/moves';
import MoveBreadcrumb from '@/features/moves/components/MoveBreadcrumb';
import RelatedMoves from '@/features/moves/components/RelatedMoves';
import { auth } from '@/shared/lib/auth';

function extractVideoId(url: string) {
  return url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const move = await getMoveByIdAction(id, undefined);
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
        tags={move.tags}
        poleType={move.poleType}
        moveId={move.id}
        isFavourited={isFavourited}
        isAuthenticated={isAuthenticated}
        currentProgress={move.currentProgress}
        gripType={move.gripType}
        entry={move.entry}
        duration={move.duration}
      />
      <RelatedMoves moves={related} />
    </main>
  );
}

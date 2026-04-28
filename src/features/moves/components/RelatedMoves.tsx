import Link from 'next/link';

type RelatedMove = {
  id: string;
  title: string;
  difficulty: string;
  imageUrl: string | null;
  youtubeUrl: string;
};

type RelatedMovesProps = {
  moves: RelatedMove[];
};

export default function RelatedMoves({ moves }: RelatedMovesProps) {
  if (moves.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-8 pb-16">
      <p className="mb-3 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
        Related moves
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {moves.map((move) => (
          <Link
            key={move.id}
            href={`/moves/${move.id}`}
            className="flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container p-3 transition-colors hover:border-primary/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface font-display text-lg text-primary/50">
              {move.title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-col">
              <p className="truncate font-display text-sm font-medium text-on-surface">
                {move.title}
              </p>
              <p className="font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
                {move.difficulty}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

import { ImageOff } from 'lucide-react';
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

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: 'text-on-secondary-container',
  INTERMEDIATE: 'text-primary',
  ADVANCED: 'text-amber-300',
};

export default function RelatedMoves({ moves }: RelatedMovesProps) {
  if (moves.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 pb-16 md:px-12">
      <p className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-on-surface-variant uppercase">
        Related moves
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {moves.map((move) => {
          const videoId = extractVideoId(move.youtubeUrl);
          const thumb =
            move.imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);
          const levelColor = DIFFICULTY_COLOR[move.difficulty] ?? 'text-on-surface-variant';

          return (
            <Link
              key={move.id}
              href={`/moves/${move.id}`}
              className="flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container p-3 transition-colors hover:border-primary/30 hover:bg-surface-high"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-high">
                {thumb ? (
                  <img src={thumb} alt="" aria-hidden className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff size={16} className="text-on-surface-variant" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-on-surface">
                  {move.title}
                </p>
                <p className={`text-[10px] font-semibold tracking-widest uppercase ${levelColor}`}>
                  {move.difficulty}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {moves.map((move) => {
          const videoId = extractVideoId(move.youtubeUrl);
          const thumb =
            move.imageUrl ??
            (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
          const levelColor = DIFFICULTY_COLOR[move.difficulty] ?? 'text-on-surface-variant';

          return (
            <Link
              key={move.id}
              href={`/moves/${move.id}`}
              className="group overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
            >
              {/* Image area */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #0e0e0e 0%, #1f1f1f 50%, #2a2a2a 100%)',
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 50%, rgba(220,184,255,0.08), transparent 65%)',
                      }}
                    />
                    <span
                      className="relative font-display text-5xl font-light"
                      style={{ color: 'rgba(220,184,255,0.3)' }}
                      aria-hidden
                    >
                      ◇
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="truncate font-display text-sm font-semibold text-on-surface">
                  {move.title}
                </p>
                <p
                  className={`mt-1 text-[10px] font-semibold tracking-widest uppercase ${levelColor}`}
                >
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

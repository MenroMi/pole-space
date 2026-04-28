'use client';
import { Heart, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useOptimistic, useTransition, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Input } from '@/shared/components/ui/input';

import { removeFavouriteAction } from '../actions';
import type { FavouriteWithMove } from '../types';

// Matches MoveCard / ProgressCard mapping
const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function MovePlaceholder() {
  return (
    <div className="to-surface-container-highest flex h-full w-full items-center justify-center bg-linear-to-br from-surface-container">
      <span className="text-5xl opacity-20 select-none">⋮</span>
    </div>
  );
}

// YouTube returns a 120x90 "Unavailable" thumbnail (HTTP 200) for non-existent IDs
const YOUTUBE_PLACEHOLDER_MAX_WIDTH = 120;

function FavouriteCardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <MovePlaceholder />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= YOUTUBE_PLACEHOLDER_MAX_WIDTH) setFailed(true);
      }}
      onError={() => setFailed(true)}
    />
  );
}

export default function FavouriteMovesGallery({
  initialFavourites,
}: {
  initialFavourites: FavouriteWithMove[];
}) {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  // confirmFav is cleared only after the close animation finishes (via onCloseAutoFocus)
  const [confirmFav, setConfirmFav] = useState<FavouriteWithMove | null>(null);
  const [removeError, setRemoveError] = useState(false);
  const [optimisticFavs, removeOptimistic] = useOptimistic(
    initialFavourites,
    (state, moveId: string) => state.filter((f) => f.moveId !== moveId),
  );
  const [isPending, startTransition] = useTransition();

  const filtered = query
    ? optimisticFavs.filter((f) => f.move.title.toLowerCase().includes(query.toLowerCase()))
    : optimisticFavs;

  function handleRemove(moveId: string) {
    setRemoveError(false);
    startTransition(async () => {
      removeOptimistic(moveId);
      try {
        await removeFavouriteAction(moveId);
      } catch {
        setRemoveError(true);
      }
    });
  }

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent
          onCloseAutoFocus={() => {
            setConfirmFav(null);
            setRemoveError(false);
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from favourites?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFav?.move.title} will be removed from your saved performances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmFav) handleRemove(confirmFav.moveId);
                // don't clear confirmFav here — onCloseAutoFocus handles it after animation
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="px-6 pb-24 md:px-12">
        {removeError && (
          <p
            role="alert"
            className="bg-error-container text-on-error-container mt-4 rounded-lg px-4 py-3 text-center text-sm"
          >
            Something went wrong. Please try again.
          </p>
        )}

        {/* Header */}
        <div className="flex flex-col justify-between gap-6 py-10 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface lowercase md:text-5xl">
              saved performances
            </h1>
            <p className="mt-3 font-sans text-lg text-on-surface-variant">
              Your curated gallery of mastered techniques.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search moves"
              placeholder="Search moves..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-9 pl-9"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Empty states */}
        {optimisticFavs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Heart size={40} className="mb-4 text-outline" />
            <p className="text-on-surface-variant">No favourites yet.</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Open any move and tap the heart to save it here.
            </p>
          </div>
        )}

        {optimisticFavs.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-on-surface-variant">No moves match &ldquo;{query}&rdquo;.</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
            {filtered.map((fav) => {
              const badge = DIFFICULTY_BADGE[fav.move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;
              return (
                <Link
                  key={fav.id}
                  href={`/moves/${fav.moveId}`}
                  className="group relative block overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-low transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {(() => {
                      const videoId = extractVideoId(fav.move.youtubeUrl);
                      const src =
                        fav.move.imageUrl ??
                        (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
                      return src ? (
                        <FavouriteCardImage src={src} alt={fav.move.title} />
                      ) : (
                        <MovePlaceholder />
                      );
                    })()}

                    {/* Top overlay */}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-linear-to-b from-surface/80 to-transparent p-4">
                      <span
                        className={`rounded-full border border-outline-variant/20 px-3 py-1 font-sans text-xs font-bold tracking-widest uppercase ${badge.className}`}
                        style={badge.style}
                      >
                        {fav.move.difficulty.charAt(0) + fav.move.difficulty.slice(1).toLowerCase()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmFav(fav);
                          setDialogOpen(true);
                        }}
                        disabled={isPending}
                        aria-label={`Remove ${fav.move.title} from favourites`}
                        className="text-error hover:bg-error/20 cursor-pointer rounded-full bg-surface/40 p-2 backdrop-blur-md transition-all duration-150 hover:scale-110 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <h3 className="mb-1.5 font-display text-xl font-bold tracking-tight text-on-surface lowercase">
                      {fav.move.title.toLowerCase()}
                    </h3>
                    {fav.move.description && (
                      <p className="mb-3 line-clamp-2 font-sans text-sm text-on-surface-variant">
                        {fav.move.description}
                      </p>
                    )}
                    <span className="font-sans text-xs tracking-widest text-primary uppercase">
                      Added {formatDate(fav.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

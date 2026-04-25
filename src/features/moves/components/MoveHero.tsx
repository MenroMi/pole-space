'use client';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'transitioning' | 'playing';

type MoveHeroProps = {
  title: string;
  youtubeUrl: string;
  imageUrl: string | null;
};

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function MoveHero({ title, youtubeUrl, imageUrl }: MoveHeroProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoId = extractVideoId(youtubeUrl);
  const thumbnail =
    imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handlePlay() {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('playing');
    } else {
      setPhase('transitioning');
      timeoutRef.current = setTimeout(() => setPhase('playing'), 500);
    }
  }

  return (
    <div className="relative h-[65vh] w-full overflow-hidden bg-black">
      {/* Thumbnail — visible in idle, zooms+blurs+fades during transitioning */}
      {phase !== 'playing' &&
        (thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            priority
            className={`object-cover transition-all duration-500 ${
              phase === 'transitioning'
                ? 'scale-110 opacity-0 blur-sm'
                : 'scale-100 opacity-80 blur-none'
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container" />
        ))}

      {/* iframe — mounts during transitioning (opacity-0), fades in, stays for playing */}
      {phase !== 'idle' && videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${
            phase === 'transitioning' ? 'opacity-0' : 'opacity-100'
          }`}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      )}

      {/* Play button — visible only in idle */}
      {phase === 'idle' && videoId && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${title}`}
          className="group absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface/70 text-primary shadow-[0_0_32px_rgba(220,184,255,0.06)] backdrop-blur-md transition-transform group-hover:scale-105">
            <Play size={36} fill="currentColor" aria-hidden="true" />
          </div>
        </button>
      )}

      {/* Bottom gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent"
      />
    </div>
  );
}

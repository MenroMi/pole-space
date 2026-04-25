'use client';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type Phase = 'idle' | 'entering' | 'playing';

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
  const videoId = extractVideoId(youtubeUrl);
  const thumbnail =
    imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  function handlePlay() {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('playing');
    } else {
      setPhase('entering');
      setTimeout(() => setPhase('playing'), 600);
    }
  }

  return (
    <div className="relative h-[65vh] w-full overflow-hidden bg-black">
      {/* Thumbnail / placeholder */}
      {phase !== 'playing' &&
        (thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            priority
            className={`object-cover transition-opacity duration-500 ${
              phase === 'entering' ? 'opacity-0' : 'opacity-80'
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container" />
        ))}

      {/* YouTube iframe */}
      {phase === 'playing' && videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      )}

      {/* Top letterbox bar */}
      <div
        aria-hidden="true"
        className={`absolute top-0 left-0 h-1/2 w-full bg-black ${
          phase === 'playing'
            ? 'hidden'
            : `transition-transform duration-500 ease-in-out ${
                phase === 'entering' ? 'translate-y-0' : '-translate-y-full'
              }`
        }`}
      />
      {/* Bottom letterbox bar */}
      <div
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-1/2 w-full bg-black ${
          phase === 'playing'
            ? 'hidden'
            : `transition-transform duration-500 ease-in-out ${
                phase === 'entering' ? 'translate-y-0' : 'translate-y-full'
              }`
        }`}
      />

      {/* Play button */}
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

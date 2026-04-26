'use client';
import { useEffect, useRef, useState } from 'react';

import type { StepItem } from '../types';

import MoveHero from './MoveHero';
import MoveTabs from './MoveTabs';

type MovePlayerProps = {
  title: string;
  youtubeUrl: string;
  imageUrl: string | null;
  stepsData: StepItem[];
  children: React.ReactNode;
};

export default function MovePlayer({
  title,
  youtubeUrl,
  imageUrl,
  stepsData,
  children,
}: MovePlayerProps) {
  const [seekRequest, setSeekRequest] = useState<{ seconds: number } | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  function handleSeek(seconds: number) {
    const request = { seconds };
    if (window.scrollY === 0) {
      setSeekRequest(request);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // 400ms matches the browser's smooth-scroll animation duration
      scrollTimerRef.current = setTimeout(() => setSeekRequest(request), 400);
    }
  }

  return (
    <>
      <MoveHero
        title={title}
        youtubeUrl={youtubeUrl}
        imageUrl={imageUrl}
        seekRequest={seekRequest ?? undefined}
      />
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
        {children}
        <MoveTabs stepsData={stepsData} onSeek={handleSeek} />
      </div>
    </>
  );
}

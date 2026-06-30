'use client';
import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { focalToObjectPosition } from '@/features/moves/lib/focal';

interface MoveCardImageProps {
  src: string;
  alt: string;
  focalX?: number;
  focalY?: number;
}

// YouTube returns a 120x90 "Unavailable" thumbnail (HTTP 200) for IDs that
// don't exist — we can't use onError. Instead we check the loaded image's
// naturalWidth: real hqdefault is 480px wide, placeholder is 120px.
const YOUTUBE_PLACEHOLDER_MAX_WIDTH = 120;

export default function MoveCardImage({ src, alt, focalX, focalY }: MoveCardImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      style={{ objectPosition: focalToObjectPosition(focalX, focalY) }}
      className="object-cover transition-transform duration-700 group-hover:scale-105"
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= YOUTUBE_PLACEHOLDER_MAX_WIDTH) {
          setFailed(true);
        }
      }}
      onError={() => setFailed(true)}
    />
  );
}

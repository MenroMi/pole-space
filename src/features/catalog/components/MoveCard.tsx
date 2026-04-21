import Image from 'next/image'
import Link from 'next/link'

import type { MoveWithTags } from '../types'

function extractVideoId(youtubeUrl: string): string | null {
  const match = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
}

export default function MoveCard({ move }: { move: MoveWithTags }) {
  const badge = DIFFICULTY_BADGE[move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER

  const imageSrc: string | null =
    move.imageUrl ??
    (() => {
      const videoId = extractVideoId(move.youtubeUrl)
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
    })()

  const visibleTags = move.tags.slice(0, 3)

  return (
    <Link
      href={`/moves/${move.id}`}
      className="block overflow-hidden rounded-xl bg-surface-container transition-colors hover:bg-surface-high"
    >
      {imageSrc && (
        <div className="relative aspect-video">
          <Image src={imageSrc} alt={move.title} fill className="object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-2 p-4">
        <span
          className={`self-start rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
          style={badge.style}
        >
          {move.difficulty}
        </span>
        <h3 className="truncate font-display font-semibold text-on-surface">{move.title}</h3>
        {move.description && (
          <p className="line-clamp-2 font-sans text-sm text-on-surface-variant">
            {move.description}
          </p>
        )}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

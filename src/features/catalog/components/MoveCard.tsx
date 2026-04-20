import Image from 'next/image'
import Link from 'next/link'
import { ImageOff } from 'lucide-react'
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

  const imageSrc: string | null = move.imageUrl ?? (() => {
    const videoId = extractVideoId(move.youtubeUrl)
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
  })()

  const visibleTags = move.tags.slice(0, 3)

  return (
    <Link
      href={`/moves/${move.id}`}
      className="block bg-surface-container hover:bg-surface-high rounded-xl overflow-hidden transition-colors"
    >
      <div className="relative aspect-video bg-accent flex items-center justify-center">
        {imageSrc ? (
          <Image src={imageSrc} alt={move.title} fill className="object-cover" />
        ) : (
          <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="p-4 flex flex-col gap-2">
        <span
          className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}
          style={badge.style}
        >
          {move.difficulty}
        </span>
        <h3 className="font-display text-on-surface font-semibold truncate">{move.title}</h3>
        {move.description && (
          <p className="text-sm text-on-surface-variant line-clamp-2 font-sans">
            {move.description}
          </p>
        )}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {visibleTags.map(tag => (
              <span
                key={tag.id}
                className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full"
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

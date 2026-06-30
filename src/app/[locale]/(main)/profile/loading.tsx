import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors ProfileOverview: hero + 4 stat chips + 2-col (currently-learning / breakdown+favourites).
export default function ProfileLoading() {
  return (
    <div className="px-4 pt-5 pb-24 sm:px-6 sm:pt-8 md:px-12">
      {/* Hero */}
      <div className="flex flex-row gap-4 rounded-2xl border border-outline-variant/40 p-5 sm:gap-8 sm:p-10 md:items-end md:p-12">
        <Skeleton className="h-[70px] w-[70px] shrink-0 rounded-[13px] sm:h-32 sm:w-32 md:h-40 md:w-40" />
        <div className="flex flex-1 flex-col gap-1">
          {/* location eyebrow */}
          <Skeleton style={{ height: 11, width: 90 }} />
          {/* name — text-2xl sm:text-4xl md:text-[60px] */}
          <div
            aria-hidden="true"
            className="font-display text-2xl font-semibold tracking-tight capitalize sm:text-4xl md:text-[60px] md:leading-none"
          >
            <Skeleton className="inline-block w-3/5 align-middle" style={{ height: '0.7em' }} />
          </div>
          {/* username · joined */}
          <div className="text-[11px] sm:text-sm md:mt-1" aria-hidden="true">
            <Skeleton className="inline-block w-2/5 align-middle" style={{ height: '0.7em' }} />
          </div>
          {/* settings button */}
          <div className="mt-2 flex justify-end sm:justify-start md:mt-4">
            <Skeleton className="h-[31px] w-28 md:h-[38px] md:w-32" style={{ borderRadius: 8 }} />
          </div>
        </div>
      </div>

      {/* Stats: 4 chips (2-col mobile, 4-col xl) */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-outline-variant/30 bg-outline-variant/30 sm:mt-8 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 bg-surface-low p-[18px_16px] sm:gap-6 sm:p-6 md:p-8"
          >
            <Skeleton style={{ height: 22, width: 22, borderRadius: 6 }} />
            <Skeleton style={{ height: 36, width: 60 }} />
            <Skeleton style={{ height: 10, width: 80 }} />
          </div>
        ))}
      </div>

      {/* 2-col: currently learning | breakdown + favourites preview */}
      <div className="mt-5 grid grid-cols-1 gap-[18px] md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <Skeleton style={{ height: 12, width: 160, marginBottom: 4 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-outline-variant/[0.18] bg-surface-container p-[13px]"
            >
              <Skeleton style={{ height: 56, width: 56, borderRadius: 10, flexShrink: 0 }} />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton style={{ height: 14, width: '70%' }} />
                <Skeleton style={{ height: 11, width: '45%' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[18px]">
          <Skeleton className="rounded-xl" style={{ height: 200 }} />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

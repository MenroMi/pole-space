import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors the move detail page: breadcrumb + MovePlayer (hero 16:9 + info panel)
// + MoveSpecs grid + MoveTabs + RelatedMoves row.
export default function MoveLoading() {
  return (
    <main>
      {/* Breadcrumb (desktop only) */}
      <div className="mx-auto hidden max-w-[1280px] px-8 pt-6 sm:block">
        <Skeleton style={{ height: 12, width: 220 }} />
      </div>

      {/* MovePlayer */}
      <div className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-8 sm:py-8">
        {/* Hero grid: video 1.4fr | info 1fr */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
          {/* Left: video */}
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />

          {/* Right: info panel */}
          <div className="flex flex-col gap-5">
            {/* difficulty chip (desktop only) */}
            <Skeleton
              className="hidden sm:block"
              style={{ height: 22, width: 110, borderRadius: 9999 }}
            />
            {/* title (desktop only) — text-[28px] sm:text-[40px] lg:text-[52px] */}
            <div
              aria-hidden="true"
              className="hidden font-display text-[28px] leading-[1.05] font-semibold lowercase sm:block sm:text-[40px] sm:leading-[0.95] lg:text-[52px]"
            >
              <Skeleton className="inline-block w-3/4 align-middle" style={{ height: '0.7em' }} />
            </div>
            {/* description */}
            <div className="flex flex-col gap-2">
              <Skeleton style={{ height: 16, width: '100%' }} />
              <Skeleton style={{ height: 16, width: '92%' }} />
              <Skeleton style={{ height: 16, width: '60%' }} />
            </div>
            {/* mobile meta row (sm:hidden) */}
            <div className="flex items-center gap-2 sm:hidden">
              <Skeleton style={{ height: 20, width: 90, borderRadius: 9999 }} />
              <Skeleton style={{ height: 12, width: 60 }} />
            </div>
            {/* tags (desktop only) */}
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 24, width: 72, borderRadius: 9999 }} />
              ))}
            </div>
            {/* actions */}
            <div className="mt-2 flex items-center gap-3">
              <Skeleton style={{ height: 44, width: 120, borderRadius: 8 }} />
              <Skeleton className="flex-1" style={{ height: 44, borderRadius: 8 }} />
            </div>
          </div>
        </div>

        {/* MoveSpecs */}
        <div className="mt-6 sm:mt-8">
          <Skeleton style={{ height: 10, width: 80, marginBottom: 12 }} />
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-outline-variant/15 bg-surface-lowest p-3 sm:p-6"
              >
                <Skeleton style={{ height: 9, width: 60 }} />
                <Skeleton style={{ height: 18, width: '70%' }} />
              </div>
            ))}
          </div>
        </div>

        {/* MoveTabs */}
        <div className="mt-6 sm:mt-10">
          <div className="mb-6 flex gap-5 border-b border-outline-variant/15 pb-3 sm:mb-8 sm:gap-8 sm:pb-4">
            <Skeleton style={{ height: 14, width: 90 }} />
            <Skeleton style={{ height: 14, width: 110 }} />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton style={{ height: 24, width: 24, borderRadius: 6, flexShrink: 0 }} />
                <Skeleton style={{ height: 16, width: `${80 - i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RelatedMoves */}
      <section className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-8">
        <Skeleton style={{ height: 10, width: 100, marginBottom: 16 }} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container"
            >
              <Skeleton className="aspect-[4/3] w-full" style={{ borderRadius: 0 }} />
              <div className="flex flex-col gap-2 p-3">
                <Skeleton style={{ height: 14, width: '75%' }} />
                <Skeleton style={{ height: 10, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

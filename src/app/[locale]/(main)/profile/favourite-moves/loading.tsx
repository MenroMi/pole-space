import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors FavouriteMovesGallery: header + toolbar (search + sort) + card grid (16:9 mobile, 4:5 desktop).
export default function FavouritesLoading() {
  return (
    <div className="px-4 pb-24 sm:px-6 md:px-12">
      {/* Mobile header (text-[22px]) */}
      <div className="mt-4 sm:hidden" aria-hidden="true">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="h-px w-6 bg-primary" />
          <Skeleton style={{ height: 9, width: 80 }} />
        </div>
        <div className="font-display text-[22px] font-semibold">
          <Skeleton className="inline-block w-40 align-middle" style={{ height: '0.7em' }} />
        </div>
        <div className="mt-1 text-[13px]">
          <Skeleton className="inline-block w-3/4 align-middle" style={{ height: '0.7em' }} />
        </div>
      </div>

      {/* Desktop header (text-3xl sm:text-5xl md:text-[64px]) */}
      <div className="mt-5 hidden sm:block" aria-hidden="true">
        <Skeleton style={{ height: 10, width: 180, marginBottom: 12 }} />
        <div className="font-display text-3xl font-semibold lowercase sm:text-5xl md:text-[64px]">
          <Skeleton className="inline-block w-1/2 align-middle" style={{ height: '0.7em' }} />
        </div>
        <div className="mt-3.5 max-w-[460px] text-base leading-relaxed">
          <Skeleton className="inline-block w-full align-middle" style={{ height: '0.7em' }} />
        </div>
      </div>

      {/* Toolbar: search + sort */}
      <div className="mt-4 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:border-t sm:border-outline-variant/30 sm:pt-5">
        <Skeleton className="w-full sm:w-[280px]" style={{ height: 40, borderRadius: 10 }} />
        <Skeleton style={{ height: 36, width: 160, borderRadius: 10 }} />
      </div>

      {/* Grid */}
      <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-[18px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container"
          >
            <Skeleton
              className="aspect-[16/9] w-full sm:aspect-[4/5]"
              style={{ borderRadius: 0 }}
            />
            <div className="hidden flex-col gap-2 p-4 sm:flex">
              <Skeleton style={{ height: 16, width: '70%' }} />
              <Skeleton style={{ height: 12, width: '90%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

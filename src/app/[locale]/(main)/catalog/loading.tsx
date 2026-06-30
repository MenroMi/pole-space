import PageShell from '@/shared/components/PageShell';
import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors MoveCard: image with a difficulty chip overlaid top-left, then title + tag pills.
function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container">
      <div className="relative aspect-[16/9] w-full sm:aspect-[4/5]">
        <Skeleton className="absolute inset-0 h-full w-full" style={{ borderRadius: 0 }} />
        <Skeleton
          className="absolute top-2 left-2 sm:top-3 sm:left-3"
          style={{ height: 18, width: 64, borderRadius: 9999 }}
        />
      </div>
      <div className="flex flex-1 flex-col px-[11px] py-[9px] sm:p-4">
        {/* title — truncate (1 line); track real text-[15px] sm:text-lg height */}
        <div aria-hidden="true" className="font-display text-[15px] font-semibold sm:text-lg">
          <Skeleton className="inline-block w-[70%] align-middle" style={{ height: '0.7em' }} />
        </div>
        <div className="mt-auto flex gap-1 pt-[7px] sm:pt-2">
          <Skeleton style={{ height: 18, width: 48, borderRadius: 9999 }} />
          <Skeleton style={{ height: 18, width: 60, borderRadius: 9999 }} />
        </div>
      </div>
    </div>
  );
}

export default function CatalogLoading() {
  return (
    <PageShell
      aside={
        <div className="flex flex-col gap-4 p-4">
          <Skeleton style={{ height: 40 }} />
          <Skeleton style={{ height: 24, width: '60%' }} />
          <Skeleton style={{ height: 24, width: '50%' }} />
          <Skeleton style={{ height: 24, width: '55%' }} />
        </div>
      }
    >
      <div className="px-3.5 pt-3 pb-4 sm:p-6">
        <div className="mb-4 sm:mb-8" aria-hidden="true">
          <Skeleton style={{ height: 11, width: 120, marginBottom: 12 }} />
          <div className="font-display text-2xl font-bold tracking-tight lowercase sm:text-4xl md:text-5xl">
            <Skeleton className="inline-block w-3/5 align-middle" style={{ height: '0.7em' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

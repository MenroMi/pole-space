import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors ProgressTracker: header (responsive 22→64px) + toolbar (search + tabs) +
// list of ProgressCard rows (thumb 46→56px + body + status-button footer).
function ProgressRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/[0.18] bg-surface-container">
      <div className="flex items-start gap-[11px] p-[13px]">
        <Skeleton
          className="h-[46px] w-[46px] shrink-0 sm:h-[56px] sm:w-[56px]"
          style={{ borderRadius: 10 }}
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton style={{ height: 14, width: '50%' }} />
            <Skeleton style={{ height: 18, width: 64, borderRadius: 9999 }} />
          </div>
          <Skeleton style={{ height: 11, width: '70%' }} />
        </div>
      </div>
      {/* Status-button strip footer */}
      <div className="flex border-t border-outline-variant/[0.12]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-1 justify-center py-[7px]">
            <Skeleton style={{ height: 12, width: '60%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProgressLoading() {
  return (
    <div className="px-4 pb-24 sm:px-6 md:px-12">
      {/* Mobile header (text-[22px]) */}
      <div className="mt-4 sm:hidden" aria-hidden="true">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="h-px w-6 bg-primary" />
          <Skeleton style={{ height: 9, width: 90 }} />
        </div>
        <div className="font-display text-[22px] font-semibold">
          <Skeleton className="inline-block w-44 align-middle" style={{ height: '0.7em' }} />
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

      {/* Toolbar: search + 3 tab pills */}
      <div className="mt-4 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:border-t sm:border-outline-variant/30 sm:pt-5">
        <Skeleton className="w-full sm:w-[280px]" style={{ height: 40, borderRadius: 10 }} />
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 38, width: 90, borderRadius: 10 }} />
          ))}
        </div>
      </div>

      {/* List of progress-card rows */}
      <div className="mt-9 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProgressRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

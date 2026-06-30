import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors SettingsForm 1:1 in box sizes to avoid layout shift on load:
// header typography (28/36/48px), avatar h-24 rounded-2xl, inputs h-9, location hint.
function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <Skeleton style={{ height: 12, width: 80 }} />
      <Skeleton className="h-9 w-full" style={{ borderRadius: 6 }} />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6 px-4 pt-4 pb-28 sm:space-y-8 sm:p-6 md:p-12">
      {/* Header — uses the real h1/p typography classes so the line-box height
          matches exactly per breakpoint; an inline shimmer bar fills each line. */}
      <div className="space-y-2">
        <div className="mb-3 h-[3px] w-8 rounded-full bg-primary sm:hidden" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="font-display text-[28px] leading-tight tracking-tight lowercase sm:text-4xl md:text-5xl"
        >
          <Skeleton
            className="inline-block w-40 max-w-full align-middle sm:w-52 md:w-64"
            style={{ height: '0.7em', borderRadius: 6 }}
          />
        </div>
        <div aria-hidden="true" className="text-sm sm:text-base md:text-lg">
          <Skeleton
            className="inline-block w-full max-w-[300px] align-middle sm:max-w-[360px]"
            style={{ height: '0.7em', borderRadius: 6 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-12">
        {/* Avatar section */}
        <div className="col-span-12 flex flex-col items-center space-y-6 rounded-2xl bg-surface-low p-5 text-center sm:p-8 lg:col-span-4">
          <Skeleton className="h-24 w-24" style={{ borderRadius: 16 }} />
          <div className="flex flex-col items-center space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-44" />
          </div>
        </div>

        {/* Personal info section */}
        <div className="col-span-12 space-y-4 rounded-2xl bg-surface-low p-5 sm:space-y-6 sm:p-8 lg:col-span-8">
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
            <Skeleton className="h-5 w-5" style={{ borderRadius: 5 }} />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
            {/* Location: input + hint line below */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <Skeleton style={{ height: 12, width: 80 }} />
              <Skeleton className="h-9 w-full" style={{ borderRadius: 6 }} />
              <Skeleton className="mt-0.5 h-3.5 w-1/2" />
            </div>
          </div>
        </div>

        {/* Action buttons — px-8 py-3 (~h-11) */}
        <div className="col-span-12 flex flex-col justify-end gap-4 lg:flex-row">
          <Skeleton className="h-11 w-full lg:w-28" style={{ borderRadius: 8 }} />
          <Skeleton className="h-11 w-full lg:w-40" style={{ borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}

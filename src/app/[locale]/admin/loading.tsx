import { Skeleton } from '@/shared/components/ui/skeleton';

// Mirrors AdminShell (sidebar + topbar) wrapping AdminDashboard (greeting + stat-card
// grids + health + charts). loading.tsx replaces the whole AdminApp, so the shell
// chrome is reproduced here too.
function StatCardSkeleton() {
  return (
    <div
      style={{
        background: '#1b1b1b',
        border: '1px solid rgba(75,68,80,0.2)',
        borderRadius: 12,
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton style={{ height: 10, width: 70 }} />
        <Skeleton style={{ height: 18, width: 18, borderRadius: 5 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton style={{ height: 36, width: 80 }} />
        <Skeleton style={{ height: 12, width: 110 }} />
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d', width: '100%' }}>
      {/* Sidebar (desktop) */}
      <aside
        className="hidden lg:flex"
        style={{
          flexDirection: 'column',
          width: 240,
          minWidth: 240,
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#0e0e0e',
          borderRight: '1px solid rgba(75,68,80,0.3)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '1px solid rgba(75,68,80,0.2)',
          }}
        >
          <Skeleton style={{ height: 16, width: 110 }} />
        </div>
        <div
          style={{
            flex: 1,
            padding: '16px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 38, borderRadius: 8 }} />
          ))}
        </div>
        <div
          style={{
            padding: '12px 14px 20px',
            borderTop: '1px solid rgba(75,68,80,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Skeleton style={{ height: 32, width: 32, borderRadius: 9999 }} />
          <Skeleton style={{ height: 12, width: 100 }} />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px 0 24px',
            borderBottom: '1px solid rgba(75,68,80,0.25)',
          }}
        >
          <Skeleton style={{ height: 20, width: 140 }} />
          <Skeleton style={{ height: 28, width: 60, borderRadius: 8 }} />
        </header>

        {/* Dashboard content */}
        <main style={{ flex: 1 }}>
          <div style={{ padding: '32px 40px 80px', maxWidth: 1200 }}>
            {/* Greeting */}
            <div style={{ marginBottom: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton style={{ height: 11, width: 120 }} />
              <Skeleton style={{ height: 40, width: 340 }} />
              <Skeleton style={{ height: 14, width: 220 }} />
            </div>

            {/* Row 1: 4 stat cards */}
            <div className="mb-[14px] grid grid-cols-2 gap-[14px] lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>

            {/* Row 2: 3 stat cards */}
            <div className="mb-[32px] grid grid-cols-2 gap-[14px] lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>

            {/* Row 3: catalog health (full width) */}
            <Skeleton className="rounded-xl" style={{ height: 160, marginBottom: 18 }} />

            {/* Row 4: activity chart + top favourited */}
            <div className="mb-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1.2fr]">
              <Skeleton className="rounded-xl" style={{ height: 280 }} />
              <Skeleton className="rounded-xl" style={{ height: 280 }} />
            </div>

            {/* Row 5: recent moves (full width) */}
            <Skeleton className="rounded-xl" style={{ height: 300 }} />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav placeholder */}
      <div
        className="flex lg:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          background: 'rgba(13,13,13,0.94)',
          borderTop: '1px solid rgba(75,68,80,0.2)',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 12px',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 24, width: 40, borderRadius: 6 }} />
        ))}
      </div>
    </div>
  );
}

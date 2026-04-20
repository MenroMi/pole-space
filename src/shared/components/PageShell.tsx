interface PageShellProps {
  aside: React.ReactNode
  children: React.ReactNode
}

export default function PageShell({ aside, children }: PageShellProps) {
  return (
    <div className="grid grid-cols-[260px_1fr] flex-1">
      <aside className="bg-surface-low">
        {aside}
      </aside>
      <main className="bg-surface">
        {children}
      </main>
    </div>
  )
}

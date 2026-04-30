type PageShellProps = {
  aside: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ aside, children }: PageShellProps) {
  return (
    <div className="grid flex-1 grid-cols-[260px_1fr]">
      <aside className="bg-surface-low shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="sticky top-[60px] max-h-[calc(100vh-60px)] overflow-y-auto">{aside}</div>
      </aside>
      <main className="bg-surface">{children}</main>
    </div>
  );
}

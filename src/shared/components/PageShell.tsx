type PageShellProps = {
  aside: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ aside, children }: PageShellProps) {
  return (
    <div className="grid flex-1 grid-cols-[260px_1fr]">
      <aside className="sticky top-[60px] h-[calc(100vh-60px)] self-start overflow-y-auto bg-surface-low shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        {aside}
      </aside>
      <main className="bg-surface">{children}</main>
    </div>
  );
}

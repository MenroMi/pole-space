type PageShellProps = {
  aside: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ aside, children }: PageShellProps) {
  return (
    <div className="grid flex-1 grid-cols-[260px_1fr]">
      <aside className="bg-surface-low">{aside}</aside>
      <main className="bg-surface">{children}</main>
    </div>
  );
}

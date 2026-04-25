export default function MoveBreakdown({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-xl p-8">
      <div className="space-y-6">
        {steps.map((step, index) => (
          // stable display-only list — index key is safe
          <div
            key={index}
            className="group hover:bg-surface-container-highest -mx-4 flex gap-6 rounded-lg p-4 transition-colors"
          >
            <div className="shrink-0 font-display text-4xl font-bold text-outline-variant opacity-50 transition-colors group-hover:text-primary group-hover:opacity-100">
              {String(index + 1).padStart(2, '0')}
            </div>
            <p className="font-sans leading-relaxed text-on-surface">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

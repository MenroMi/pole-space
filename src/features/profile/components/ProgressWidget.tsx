import Link from 'next/link';
import { getUserProgressAction } from '../actions';

export default async function ProgressWidget() {
  const progress = await getUserProgressAction();
  const inProgress = progress.filter((p) => p.status === 'IN_PROGRESS').slice(0, 5);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-on-surface">In Progress</h2>
        <Link href="/profile/progress" className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>
      {inProgress.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No moves in progress yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {inProgress.map((p) => (
            <li key={p.id} className="text-sm text-on-surface">
              {p.move.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

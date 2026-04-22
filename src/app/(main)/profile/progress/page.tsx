import { getUserProgressAction } from '@/features/profile';
import ProgressCard from '@/features/profile/components/ProgressCard';

export default async function ProgressPage() {
  const progress = await getUserProgressAction();

  if (progress.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-on-surface-variant">No moves tracked yet.</p>
        <p className="mt-1 text-sm text-on-surface-variant">Browse the catalog to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="font-display text-xl font-semibold text-on-surface">Progress</h1>
      <div className="flex flex-col gap-3">
        {progress.map((item) => (
          <ProgressCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

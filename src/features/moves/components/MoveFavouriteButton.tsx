'use client';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

import { addFavouriteAction, removeFavouriteAction } from '@/features/profile/actions';

type MoveFavouriteButtonProps = {
  moveId: string;
  isFavourited: boolean;
  isAuthenticated: boolean;
};

export default function MoveFavouriteButton({
  moveId,
  isFavourited,
  isAuthenticated,
}: MoveFavouriteButtonProps) {
  const router = useRouter();
  const [optimisticFav, setOptimisticFav] = useOptimistic(isFavourited);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    startTransition(async () => {
      setOptimisticFav(!isFavourited);
      if (isFavourited) {
        await removeFavouriteAction(moveId);
      } else {
        await addFavouriteAction(moveId);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={optimisticFav ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={optimisticFav}
      className="group flex flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 ${
          optimisticFav
            ? 'bg-error/20 text-error hover:bg-error/35 hover:scale-110'
            : 'bg-surface-container text-on-surface group-hover:scale-110 group-hover:bg-primary-container group-hover:text-primary'
        }`}
      >
        <Heart size={20} fill={optimisticFav ? 'currentColor' : 'none'} aria-hidden="true" />
      </div>
      <span className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {optimisticFav ? 'Saved' : 'Favourite'}
      </span>
    </button>
  );
}

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
      className={`kinetic-gradient flex min-w-[190px] cursor-pointer items-center gap-4 rounded-lg px-8 py-4 font-display text-sm font-semibold tracking-wide text-on-primary-container lowercase transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Heart
        size={20}
        className="h-6 w-6"
        fill={optimisticFav ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      <span className="flex-1 font-sans text-sm tracking-widest uppercase">
        {optimisticFav ? 'Saved' : 'Favourite'}
      </span>
    </button>
  );
}

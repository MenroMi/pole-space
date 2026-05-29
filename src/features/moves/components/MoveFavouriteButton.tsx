'use client';
import { Heart } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useOptimistic, useTransition } from 'react';

import { addFavouriteAction, removeFavouriteAction } from '@/features/profile/actions';
import { useRouter } from '@/i18n/navigation';

type MoveFavouriteButtonProps = {
  moveId: string;
  isFavourited: boolean;
  isAuthenticated: boolean;
  iconOnly?: boolean;
};

export default function MoveFavouriteButton({
  moveId,
  isFavourited,
  isAuthenticated,
  iconOnly,
}: MoveFavouriteButtonProps) {
  const t = useTranslations('moves');
  const locale = useLocale();

  const router = useRouter();
  const [optimisticFav, setOptimisticFav] = useOptimistic(isFavourited);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    startTransition(async () => {
      setOptimisticFav((prev) => !prev);
      if (optimisticFav) {
        await removeFavouriteAction(moveId);
      } else {
        await addFavouriteAction(moveId);
      }
    });
  }

  const isPolish = locale.trim().toLowerCase() === 'pl';

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={optimisticFav ? t('removeFromFavourites') : t('addToFavourites')}
        aria-pressed={optimisticFav}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
      >
        <Heart
          size={20}
          fill={optimisticFav ? 'currentColor' : 'none'}
          className={optimisticFav ? 'text-primary' : ''}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={optimisticFav ? t('removeFromFavourites') : t('addToFavourites')}
      aria-pressed={optimisticFav}
      className={`hidden h-full shrink-0 cursor-pointer items-center gap-1 overflow-hidden rounded-lg border border-outline-variant/15 bg-[#1f1f1f] pl-[10px] transition-[width] duration-300 ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex ${
        optimisticFav ? 'w-10 text-primary' : 'w-[100px] text-on-surface-variant'
      }`}
    >
      <Heart
        size={18}
        fill={optimisticFav ? 'currentColor' : 'none'}
        className="shrink-0"
        aria-hidden="true"
      />
      <span
        className={`overflow-hidden font-sans text-[12px] leading-[0.9] font-semibold tracking-[0.12em] whitespace-nowrap uppercase transition-all duration-200 ${
          optimisticFav
            ? 'max-w-0 opacity-0'
            : `${isPolish ? 'ml-2' : 'ml-4'} max-w-[72px] opacity-100`
        }`}
      >
        {t('saveFavourite')}
      </span>
    </button>
  );
}

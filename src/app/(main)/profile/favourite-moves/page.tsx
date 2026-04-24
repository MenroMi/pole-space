import { getUserFavouritesAction } from '@/features/profile';

export default async function FavouriteMovesPage() {
  const favourites = await getUserFavouritesAction();

  if (favourites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-on-surface-variant">No favourites yet.</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Open any move page and tap the heart icon to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="font-display text-xl font-semibold text-on-surface">Favourite Moves</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {favourites.map((fav) => (
          <div key={fav.id} className="rounded-xl bg-surface-container p-4">
            <p className="font-display font-semibold text-on-surface">{fav.move.title}</p>
            <p className="text-sm text-on-surface-variant">{fav.move.difficulty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

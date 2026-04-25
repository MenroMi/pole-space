import { getUserFavouritesAction } from '@/features/profile';
import FavouriteMovesGallery from '@/features/profile/components/FavouriteMovesGallery';

export default async function FavouriteMovesPage() {
  const favourites = await getUserFavouritesAction();
  return <FavouriteMovesGallery initialFavourites={favourites} />;
}

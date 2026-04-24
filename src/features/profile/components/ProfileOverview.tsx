import FavouritesWidget from './FavouritesWidget';
import ProgressWidget from './ProgressWidget';

export default function ProfileOverview() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <ProgressWidget />
      <FavouritesWidget />
    </div>
  );
}

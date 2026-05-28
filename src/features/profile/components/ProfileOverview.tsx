import { getProfileOverviewAction } from '../actions';

import ProfileCurrentlyLearning from './ProfileCurrentlyLearning';
import ProfileFavouritesPreview from './ProfileFavouritesPreview';
import ProfileHero from './ProfileHero';
import ProfileProgressBreakdown from './ProfileProgressBreakdown';
import ProfileStats from './ProfileStats';

export default async function ProfileOverview() {
  const { user, stats, breakdown, currentlyLearning, favouritesPreview } =
    await getProfileOverviewAction();

  return (
    <div className="px-4 pt-5 pb-24 sm:px-6 sm:pt-8 md:px-12">
      <ProfileHero
        firstName={user?.firstName ?? null}
        lastName={user?.lastName ?? null}
        username={user?.username ?? null}
        image={user?.image ?? null}
        location={user?.location ?? null}
        createdAt={user?.createdAt ?? new Date()}
      />

      <div className="mt-4 sm:mt-8">
        <ProfileStats
          masteredCount={stats.masteredCount}
          inProgressCount={stats.inProgressCount}
          favouritesCount={stats.favouritesCount}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-[18px] md:grid-cols-[1.2fr_1fr]">
        <ProfileCurrentlyLearning moves={currentlyLearning} />

        <div className="flex flex-col gap-[18px]">
          <ProfileProgressBreakdown
            learned={breakdown.learned}
            inProgress={breakdown.inProgress}
            wantToLearn={breakdown.wantToLearn}
          />
          <ProfileFavouritesPreview favourites={favouritesPreview} />
        </div>
      </div>
    </div>
  );
}

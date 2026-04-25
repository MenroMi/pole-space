import { getProfileStatsAction, getProfileUserAction } from '../actions';
import ProfileHero from './ProfileHero';
import ProfileStats from './ProfileStats';

export default async function ProfileOverview() {
  const [user, stats] = await Promise.all([getProfileUserAction(), getProfileStatsAction()]);

  return (
    <div className="p-6 md:p-12 space-y-12">
      <ProfileHero
        firstName={user?.firstName ?? null}
        lastName={user?.lastName ?? null}
        image={user?.image ?? null}
        location={user?.location ?? null}
        createdAt={user?.createdAt ?? new Date()}
      />
      <ProfileStats
        masteredCount={stats.masteredCount}
        favouritesCount={stats.favouritesCount}
      />
    </div>
  );
}

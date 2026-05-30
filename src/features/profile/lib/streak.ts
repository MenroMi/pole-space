export type StreakUpdate = {
  shouldUpdate: boolean;
  newCurrentStreak: number;
  newLongestStreak: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function computeNewStreak(
  lastActiveDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number,
): StreakUpdate {
  if (!DATE_RE.test(today)) throw new Error('Invalid date format');
  if (lastActiveDate !== null && !DATE_RE.test(lastActiveDate)) {
    throw new Error('Invalid date format');
  }

  if (lastActiveDate === today) {
    return {
      shouldUpdate: false,
      newCurrentStreak: currentStreak,
      newLongestStreak: longestStreak,
    };
  }

  if (lastActiveDate === null) {
    return {
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: Math.max(longestStreak, 1),
    };
  }

  const lastMs = Date.UTC(
    Number(lastActiveDate.slice(0, 4)),
    Number(lastActiveDate.slice(5, 7)) - 1,
    Number(lastActiveDate.slice(8, 10)),
  );
  const todayMs = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );
  const diffDays = Math.round((todayMs - lastMs) / 86_400_000);

  if (diffDays < 0) {
    return {
      shouldUpdate: false,
      newCurrentStreak: currentStreak,
      newLongestStreak: longestStreak,
    };
  }

  const newCurrent = diffDays === 1 ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newCurrent);
  return { shouldUpdate: true, newCurrentStreak: newCurrent, newLongestStreak: newLongest };
}

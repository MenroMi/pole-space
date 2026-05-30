import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProfileStats from './ProfileStats';

describe('ProfileStats', () => {
  const defaults = {
    masteredCount: 12,
    inProgressCount: 3,
    favouritesCount: 7,
    currentStreak: 0,
    longestStreak: 0,
  };

  it('renders all four stat cards with values', async () => {
    render(await ProfileStats(defaults));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // streak default
  });

  it('hides best-streak subtitle when longestStreak is 0', async () => {
    render(await ProfileStats(defaults));
    expect(screen.queryByText(/bestStreak/)).not.toBeInTheDocument();
  });

  it('shows best-streak subtitle when longestStreak > 0', async () => {
    render(await ProfileStats({ ...defaults, currentStreak: 5, longestStreak: 9 }));
    // Subtitle renders the bestStreak key (next-intl mock returns the key as-is).
    expect(screen.getByText(/bestStreak/)).toBeInTheDocument();
  });
});

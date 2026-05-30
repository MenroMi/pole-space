import { describe, expect, it } from 'vitest';

import { computeNewStreak } from './streak';

describe('computeNewStreak', () => {
  it('treats null lastActiveDate as fresh start (current=1, longest=max)', () => {
    expect(computeNewStreak(null, '2026-05-29', 0, 0)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 1,
    });
    expect(computeNewStreak(null, '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 10,
    });
  });
  it('returns shouldUpdate=false when lastActiveDate equals today', () => {
    expect(computeNewStreak('2026-05-29', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: false,
      newCurrentStreak: 5,
      newLongestStreak: 10,
    });
  });
  it('increments current on +1 day, leaves longest unchanged if not exceeded', () => {
    expect(computeNewStreak('2026-05-28', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });
  it('increments longest when current+1 exceeds longest', () => {
    expect(computeNewStreak('2026-05-28', '2026-05-29', 10, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 11,
      newLongestStreak: 11,
    });
  });
  it('resets to 1 after a gap of 2 days, longest unchanged', () => {
    expect(computeNewStreak('2026-05-27', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 10,
    });
  });
  it('resets to 1 after a big gap (months)', () => {
    expect(computeNewStreak('2026-01-29', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 10,
    });
  });
  it('returns shouldUpdate=false when diff < 0 (clock skew)', () => {
    expect(computeNewStreak('2026-05-30', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: false,
      newCurrentStreak: 5,
      newLongestStreak: 10,
    });
  });
  it('starts current=1, longest=1 for brand new user with 0/0', () => {
    expect(computeNewStreak('2026-05-29', '2026-05-30', 0, 0)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 1,
    });
  });
  it('handles year boundary correctly (Dec 31 → Jan 1)', () => {
    expect(computeNewStreak('2026-12-31', '2027-01-01', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });
  it('handles month boundary correctly (Jan 31 → Feb 1)', () => {
    expect(computeNewStreak('2026-01-31', '2026-02-01', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });
  it('handles leap year Feb 28 → Feb 29 (2024)', () => {
    expect(computeNewStreak('2024-02-28', '2024-02-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });
  it('handles non-leap Feb 28 → Mar 1 (2026)', () => {
    expect(computeNewStreak('2026-02-28', '2026-03-01', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });
  it('treats current === longest gracefully (no off-by-one)', () => {
    expect(computeNewStreak('2026-05-28', '2026-05-29', 10, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 11,
      newLongestStreak: 11,
    });
  });
  it('throws on invalid today format', () => {
    expect(() => computeNewStreak('2026-05-28', '2026/05/29', 5, 10)).toThrow(
      'Invalid date format',
    );
  });
  it('throws on invalid lastActiveDate format', () => {
    expect(() => computeNewStreak('not-a-date', '2026-05-29', 5, 10)).toThrow(
      'Invalid date format',
    );
  });
});

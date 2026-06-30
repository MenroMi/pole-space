import { describe, expect, it } from 'vitest';

import { focalToObjectPosition } from './focal';

describe('focalToObjectPosition', () => {
  it('formats center', () => {
    expect(focalToObjectPosition(0.5, 0.5)).toBe('50% 50%');
  });

  it('formats corners', () => {
    expect(focalToObjectPosition(0, 0)).toBe('0% 0%');
    expect(focalToObjectPosition(1, 1)).toBe('100% 100%');
  });

  it('formats arbitrary fractions as percentages', () => {
    expect(focalToObjectPosition(0.25, 0.8)).toBe('25% 80%');
  });

  it('clamps out-of-range values', () => {
    expect(focalToObjectPosition(-1, 2)).toBe('0% 100%');
  });

  it('falls back to center for null/undefined', () => {
    expect(focalToObjectPosition(null, undefined)).toBe('50% 50%');
    expect(focalToObjectPosition()).toBe('50% 50%');
  });
});

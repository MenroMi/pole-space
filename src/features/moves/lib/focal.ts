const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Convert a focal point (fractions in [0,1]) to a CSS `object-position`
 * value. Null/undefined or out-of-range inputs fall back to / clamp toward
 * center (0.5).
 */
export function focalToObjectPosition(x?: number | null, y?: number | null): string {
  const fx = clamp01(typeof x === 'number' && Number.isFinite(x) ? x : 0.5);
  const fy = clamp01(typeof y === 'number' && Number.isFinite(y) ? y : 0.5);
  return `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%`;
}

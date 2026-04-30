import type { PoleType } from '@/shared/types';

export function formatPoleTypes(types: PoleType[]): string | null {
  if (types.length === 0) return null;
  if (types.length === 2) return 'Static & Spin';
  return types[0].charAt(0) + types[0].slice(1).toLowerCase();
}

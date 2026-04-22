export const Category = {
  SPINS: 'SPINS',
  CLIMBS: 'CLIMBS',
  HOLDS: 'HOLDS',
  COMBOS: 'COMBOS',
  FLOORWORK: 'FLOORWORK',
} as const;
export type Category = (typeof Category)[keyof typeof Category];

export const Difficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

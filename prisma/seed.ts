import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local', override: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const moves = [
  // SPINS
  {
    title: 'Fireman Spin',
    description:
      'Foundational spin. Two hands, outside leg wraps, inside leg extends — the first spin every dancer learns.',
    difficulty: 'BEGINNER' as const,
    category: 'SPINS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=firemanspi01',
  },
  {
    title: 'Chair Spin',
    description:
      'Seated-pose spin — knees together, toes pointed, body leaning back like a chair in motion.',
    difficulty: 'BEGINNER' as const,
    category: 'SPINS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=chairspin001',
  },
  {
    title: 'Back Hook Spin',
    description:
      'Momentum-driven spin where the back leg hooks the pole behind you. Great warm-up spin.',
    difficulty: 'BEGINNER' as const,
    category: 'SPINS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=backhooksp01',
  },
  {
    title: 'Attitude Spin',
    description:
      'Elegant spin with one leg in attitude position — bent at 90 degrees, foot flexed behind.',
    difficulty: 'INTERMEDIATE' as const,
    category: 'SPINS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=attitudespn1',
  },
  {
    title: 'Carousel Spin',
    description:
      'Horizontal spin with body parallel to the floor, one hand high, one low. Needs core engagement.',
    difficulty: 'INTERMEDIATE' as const,
    category: 'SPINS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=carouselsp01',
  },

  // CLIMBS
  {
    title: 'Basic Climb',
    description: 'Inside leg hooks, outside leg pushes — your foundational vertical movement.',
    difficulty: 'BEGINNER' as const,
    category: 'CLIMBS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=basicclimb01',
  },
  {
    title: 'Pole Sit',
    description: 'Cross the thighs around the pole while climbing to hands-free seated position.',
    difficulty: 'BEGINNER' as const,
    category: 'CLIMBS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=polesit00001',
  },
  {
    title: 'Inside Leg Hang',
    description: 'Hang inverted from the inside leg grip. First leg-only hold most dancers learn.',
    difficulty: 'INTERMEDIATE' as const,
    category: 'CLIMBS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=insidelegh01',
  },
  {
    title: 'Cross Knee Release',
    description:
      'Advanced climb-to-hold combo. Cross knees around the pole, release hands. Requires trust in grip.',
    difficulty: 'ADVANCED' as const,
    category: 'CLIMBS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=crosskneeR1',
  },

  // HOLDS
  {
    title: 'Superman',
    description:
      'Horizontal prone hold — one leg hooks, body extends straight like flying. Core and grip essential.',
    difficulty: 'INTERMEDIATE' as const,
    category: 'HOLDS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=supermanhld1',
  },
  {
    title: 'Iguana Mount',
    description:
      'Invert, arch back, grip pole with hands and ankles — named for the lizard-like silhouette.',
    difficulty: 'INTERMEDIATE' as const,
    category: 'HOLDS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=iguanamount1',
  },
  {
    title: 'Flag',
    description:
      'Horizontal shoulder-mount hold. Body juts out perpendicular to the pole. Significant shoulder strength.',
    difficulty: 'ADVANCED' as const,
    category: 'HOLDS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=flagmove0001',
  },
  {
    title: 'Handspring',
    description:
      'Handstand on the pole with legs split. One of the hardest holds — demands wrist and shoulder mobility.',
    difficulty: 'ADVANCED' as const,
    category: 'HOLDS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=handspring01',
  },

  // COMBOS
  {
    title: 'Butterfly to Jade',
    description:
      'Transition from butterfly inversion into a jade split. Classic intermediate flow.',
    difficulty: 'INTERMEDIATE' as const,
    category: 'COMBOS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=buttertojd01',
  },
  {
    title: 'Ayesha to Superman',
    description: 'Straddle-hold handspring (Ayesha) descending into Superman. High-level combo.',
    difficulty: 'ADVANCED' as const,
    category: 'COMBOS' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=ayeshatosup1',
  },

  // FLOORWORK
  {
    title: 'Body Roll',
    description: 'Floor-based undulation from head to hips. Foundation of sensual floorwork.',
    difficulty: 'BEGINNER' as const,
    category: 'FLOORWORK' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=bodyroll0001',
  },
  {
    title: 'Pole Crawl',
    description:
      'Low prowl on all fours circling the pole — sets the tone for a floor-focused routine.',
    difficulty: 'BEGINNER' as const,
    category: 'FLOORWORK' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=polecrawl001',
  },
  {
    title: 'Floor Spin',
    description:
      'Seated spin initiated from the floor — one hand grabs the pole, body spirals around its base.',
    difficulty: 'BEGINNER' as const,
    category: 'FLOORWORK' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=floorspin001',
  },
];

async function main() {
  console.log(`Seeding ${moves.length} moves...`);

  const existing = await prisma.move.count();
  if (existing > 0) {
    console.log(
      `Skipping — database already has ${existing} moves. Delete them first if you want to re-seed.`,
    );
    return;
  }

  const result = await prisma.move.createMany({ data: moves });
  console.log(`Created ${result.count} moves.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

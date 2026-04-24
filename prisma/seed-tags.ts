import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local', override: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TAGS: { name: string; color: string }[] = [
  { name: 'aerial', color: '#3b82f6' },
  { name: 'beginner-friendly', color: '#22c55e' },
  { name: 'core', color: '#f97316' },
  { name: 'flexibility', color: '#a855f7' },
  { name: 'inversion', color: '#ec4899' },
  { name: 'strength', color: '#ef4444' },
];

const TAG_MAP: Record<string, string[]> = {
  'Fireman Spin': ['beginner-friendly', 'core'],
  'Chair Spin': ['beginner-friendly'],
  'Back Hook Spin': ['beginner-friendly'],
  'Attitude Spin': ['flexibility', 'core'],
  'Carousel Spin': ['aerial', 'core', 'strength'],
  'Basic Climb': ['beginner-friendly', 'strength'],
  'Pole Sit': ['aerial', 'strength'],
  'Inside Leg Hang': ['aerial', 'inversion', 'strength'],
  'Cross Knee Release': ['aerial', 'inversion', 'strength'],
  Superman: ['aerial', 'flexibility', 'strength'],
  'Iguana Mount': ['aerial', 'flexibility', 'inversion'],
  Flag: ['aerial', 'strength'],
  Handspring: ['aerial', 'flexibility', 'inversion', 'strength'],
  'Butterfly to Jade': ['aerial', 'flexibility', 'inversion'],
  'Ayesha to Superman': ['aerial', 'inversion', 'strength'],
  'Body Roll': ['beginner-friendly', 'flexibility'],
  'Pole Crawl': ['beginner-friendly'],
  'Floor Spin': ['beginner-friendly'],
};

async function main() {
  // upsert tags
  for (const { name, color } of TAGS) {
    await prisma.tag.upsert({ where: { name }, update: { color }, create: { name, color } });
  }
  console.log(`Upserted ${TAGS.length} tags.`);

  const tags = await prisma.tag.findMany();
  const tagByName = Object.fromEntries(tags.map((t) => [t.name, t.id]));

  let updated = 0;
  for (const [title, tagNames] of Object.entries(TAG_MAP)) {
    const move = await prisma.move.findFirst({ where: { title } });
    if (!move) {
      console.warn(`Move not found: ${title}`);
      continue;
    }

    const tagIds = tagNames.map((n) => ({ id: tagByName[n] }));
    await prisma.move.update({
      where: { id: move.id },
      data: { tags: { connect: tagIds } },
    });
    updated++;
  }

  console.log(`Tagged ${updated} moves.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

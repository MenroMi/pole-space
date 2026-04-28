import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local', override: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const notes: { title: string; coachNote: string; coachNoteAuthor: string }[] = [
  {
    title: 'Fireman Spin',
    coachNote:
      "Don't rush the momentum — let the swing carry you. The moment you muscle through it, the spin dies. Trust the pole, trust the physics.",
    coachNoteAuthor: 'Studio Maja, Zagreb',
  },
  {
    title: 'Chair Spin',
    coachNote:
      'Think of your knees as a single unit. The second they drift apart, your shape collapses. Keep them glued, cross your ankles, and the spin will hold itself.',
    coachNoteAuthor: 'Vertical Dance Academy, London',
  },
  {
    title: 'Basic Climb',
    coachNote:
      "Your hands are just a guide — the climb lives in your legs. If your arms are doing all the work, your foot grip isn't tight enough. Squeeze, push, rise.",
    coachNoteAuthor: 'Polehouse Studios, Berlin',
  },
  {
    title: 'Inside Leg Hang',
    coachNote:
      'The panic moment is real and it will pass. Once you feel the crook of your knee lock in, breathe out and let your torso drop slowly. Tension is what makes you fall — softness is what keeps you up.',
    coachNoteAuthor: 'Studio Maja, Zagreb',
  },
  {
    title: 'Superman',
    coachNote:
      "Keep your gaze slightly up and your jaw soft. The whole aesthetic of this move lives in the line from your crown to your heel — if you're looking at the floor, that line breaks.",
    coachNoteAuthor: 'Aerial Arts Collective, Amsterdam',
  },
  {
    title: 'Carousel Spin',
    coachNote:
      'Horizontal is not a destination, it is a direction. Most students stop at 45° because they lose nerve. Keep pressing the heels away and let the momentum pull you the rest of the way.',
    coachNoteAuthor: 'Vertical Dance Academy, London',
  },
];

async function main() {
  console.log(`Adding coach notes to ${notes.length} moves...`);

  let updated = 0;
  let notFound = 0;

  for (const { title, coachNote, coachNoteAuthor } of notes) {
    const move = await prisma.move.findFirst({ where: { title } });
    if (!move) {
      console.log(`  ⚠️  Not found: "${title}" — skipping`);
      notFound++;
      continue;
    }
    await prisma.move.update({ where: { id: move.id }, data: { coachNote, coachNoteAuthor } });
    console.log(`  ✓  Updated: "${title}"`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${notFound} not found.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

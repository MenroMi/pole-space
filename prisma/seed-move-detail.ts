import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import 'dotenv/config';
import { Pool } from 'pg';

config({ path: '.env.local', override: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type StepItem = { text: string; timestamp?: number };

const updates: {
  title: string;
  gripType: string;
  entry: string;
  duration: string;
  poleType: 'STATIC' | 'SPIN';
  stepsData: StepItem[];
}[] = [
  {
    title: 'Fireman Spin',
    gripType: 'Baseball grip',
    entry: 'Standing, facing pole',
    duration: '2–4 counts',
    poleType: 'SPIN',
    stepsData: [
      {
        text: "Stand sideways to the pole at arm's length, inside shoulder facing it.",
        timestamp: 4,
      },
      {
        text: 'Place your inside hand high on the pole at shoulder height, palm facing away.',
        timestamp: 7,
      },
      {
        text: 'Place your outside hand just below, creating a wide grip.',
        timestamp: 10,
      },
      {
        text: 'Swing your outside leg forward and use the momentum to lift off the ground.',
        timestamp: 28,
      },
      {
        text: 'Wrap your inside leg around the pole — this is your anchor.',
        timestamp: 30,
      },
      {
        text: 'Extend your outside leg straight, toes pointed, body long.',
        timestamp: 35,
      },
      {
        text: 'Hold the shape and enjoy the rotation.',
      },
      {
        text: 'Land softly by releasing the leg wrap and stepping down.',
        timestamp: 40,
      },
    ],
  },
  {
    title: 'Chair Spin',
    gripType: 'Split grip',
    entry: 'Standing, facing pole',
    duration: '2–4 counts',
    poleType: 'SPIN',
    stepsData: [
      { text: 'Stand facing the pole, feet together.', timestamp: 5 },
      {
        text: 'Place your dominant hand high on the pole, palm facing in. Place your other hand lower, palm out — this is split grip.',
        timestamp: 10,
      },
      { text: 'Swing your outer leg forward to build momentum and jump.', timestamp: 18 },
      { text: "Bring both knees up together as if you're sitting in a chair.", timestamp: 25 },
      { text: 'Cross your ankles, point your toes, and keep your back slightly arched.' },
      { text: 'Keep your elbows soft — squeezing too hard kills the spin.' },
      { text: 'As the spin slows, uncross your legs and step down.', timestamp: 40 },
    ],
  },
  {
    title: 'Carousel Spin',
    gripType: 'Split grip',
    entry: 'Standing, facing pole',
    duration: '4–6 counts',
    poleType: 'SPIN',
    stepsData: [
      {
        text: 'Stand facing the pole. Place your top hand high in split grip, bottom hand at hip height.',
        timestamp: 5,
      },
      {
        text: 'Kick your outer leg to the side and use the momentum to lift both feet off the ground.',
        timestamp: 15,
      },
      { text: 'Let your body fall horizontal — aim to be parallel to the floor.', timestamp: 22 },
      { text: 'Extend both legs away from the pole, heels pressing outward.' },
      { text: 'Engage your core to keep your hips level and body flat.' },
      { text: 'Point your toes and hold the line from head to heel.', timestamp: 38 },
      { text: 'Let the spin slow naturally, then tuck your knees and step down.', timestamp: 50 },
    ],
  },
  {
    title: 'Inside Leg Hang',
    gripType: 'Outside elbow grip',
    entry: 'From climb or standing',
    duration: 'Hold 2–4 counts',
    poleType: 'STATIC',
    stepsData: [
      {
        text: 'Climb to a comfortable height — at least waist level above the floor.',
        timestamp: 8,
      },
      {
        text: 'Bring the pole to the crook of one knee (inside leg), squeezing firmly.',
        timestamp: 18,
      },
      {
        text: 'Wrap the foot of that leg around the pole and point the toe to lock the grip.',
        timestamp: 27,
      },
      { text: 'Engage your core and slowly lower your hands away from the pole.', timestamp: 35 },
      {
        text: 'Let your torso drop back — keep the leg squeeze active the entire time.',
        timestamp: 42,
      },
      { text: 'Extend your free leg long and point both feet.' },
      { text: 'Hold the position, feeling the stretch through your torso.' },
      {
        text: 'To exit, reach back up to the pole with both hands before releasing the leg.',
        timestamp: 60,
      },
    ],
  },
  {
    title: 'Superman',
    gripType: 'Outside elbow grip',
    entry: 'From climb or Pole Sit',
    duration: 'Hold 2–4 counts',
    poleType: 'STATIC',
    stepsData: [
      {
        text: 'From a Pole Sit (thighs crossed around the pole), place one hand high and one hand low.',
        timestamp: 8,
      },
      {
        text: 'Engage the outside elbow against the pole to create a secondary grip point.',
        timestamp: 16,
      },
      { text: 'Slowly lean your body forward and away from the pole.', timestamp: 25 },
      {
        text: 'Extend your top leg long behind you, pressing the heel toward the ceiling.',
        timestamp: 33,
      },
      { text: 'Your bottom leg can hook the pole or extend parallel — choose based on comfort.' },
      { text: 'Release your hands one at a time once you feel stable in the hold.', timestamp: 45 },
      { text: "Stretch your arms forward like you're flying — gaze slightly up." },
      {
        text: 'To exit, reach back to the pole, re-engage your leg grip, and climb down.',
        timestamp: 58,
      },
    ],
  },
  {
    title: 'Basic Climb',
    gripType: 'Standard grip',
    entry: 'Standing, facing pole',
    duration: '2–3 counts per step',
    poleType: 'STATIC',
    stepsData: [
      { text: 'Stand facing the pole, feet hip-width apart.', timestamp: 5 },
      { text: 'Place both hands on the pole above your head, thumbs down.', timestamp: 10 },
      {
        text: 'Jump and wrap your dominant (inside) leg around the pole at the knee.',
        timestamp: 17,
      },
      { text: 'Squeeze the pole between your inner knee and the top of your foot.', timestamp: 25 },
      { text: 'Use your hands to pull up while your feet push against the pole.', timestamp: 32 },
      { text: 'Move your lower leg grip up, then hands — alternate in a crawling motion.' },
      { text: 'Keep your elbows bent and core engaged throughout.' },
      { text: 'To descend, reverse the motion slowly — never slide uncontrolled.', timestamp: 55 },
    ],
  },
];

async function main() {
  console.log(`Updating ${updates.length} moves with stepsData and detail fields...`);

  let updated = 0;
  let notFound = 0;

  for (const { title, ...data } of updates) {
    const move = await prisma.move.findFirst({ where: { title } });
    if (!move) {
      console.log(`  ⚠️  Not found: "${title}" — skipping`);
      notFound++;
      continue;
    }
    await prisma.move.update({ where: { id: move.id }, data });
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

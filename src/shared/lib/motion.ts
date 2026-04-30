import type { Variants } from 'framer-motion';

export const cardVariants: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: {
    opacity: 0,
    y: -6,
    pointerEvents: 'none',
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

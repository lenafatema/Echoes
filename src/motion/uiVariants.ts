import type { Variants } from 'framer-motion';

export const screenVariants: Variants = {
  enter: (direction: number) => ({ x: direction * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: -direction * 28, opacity: 0 }),
};

export const reducedScreenVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

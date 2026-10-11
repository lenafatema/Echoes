export const motionEasings = {
  entrance: 'cubic-bezier(0.22, 1, 0.36, 1)',
  travel: 'cubic-bezier(0.65, 0, 0.35, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  framerEntrance: [0.22, 1, 0.36, 1] as const,
  framerTravel: [0.65, 0, 0.35, 1] as const,
  framerExit: [0.4, 0, 1, 1] as const,
  gsapEntrance: 'power2.out',
  gsapTravel: 'power2.inOut',
} as const;

// Framer Motion needs Bézier values; GSAP uses matching power2 approximations.

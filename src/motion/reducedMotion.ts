export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function shouldUseReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(reducedMotionQuery).matches;
}

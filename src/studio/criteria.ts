import type { Scenario } from '../scenarios/schema';
import type { StudioCriterion } from './types';

/** Returns an unused, in-domain default criterion for the next Studio goal. */
export function nextStudioCriterion(
  scenario: Scenario,
  existing: StudioCriterion[],
  kind: 'mission' | 'mastery',
): StudioCriterion | null {
  const measure = scenario.measures.find((candidate) => !existing.some((criterion) => criterion.measure === candidate.key));
  if (!measure) return null;

  const [min, max] = measure.domain;
  const span = max - min;
  const ratio = kind === 'mission' ? 0.6 : 0.75;
  const direction = measure.higherIsBetter ? ratio : 1 - ratio;
  const value = Math.round((min + span * direction) * 100) / 100;
  const description = `${measure.label} ${measure.higherIsBetter ? 'reaches' : 'stays at or below'} ${value}`;

  return {
    measure: measure.key,
    ...(measure.higherIsBetter ? { min: value } : { max: value }),
    description,
  };
}

export function canAddStudioCriterion(scenario: Scenario, existing: StudioCriterion[]): boolean {
  return scenario.measures.some((measure) => !existing.some((criterion) => criterion.measure === measure.key));
}

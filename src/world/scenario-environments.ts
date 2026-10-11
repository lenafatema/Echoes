import { colors } from '../tokens/colors.ts';
export type EnvironmentKind = 'stage' | 'office' | 'kitchen' | 'hall' | 'set' | 'field' | 'workshop';

/** Stable visual identity mapping; this is presentation-only and never enters engine state. */
export const scenarioEnvironment: Readonly<Record<string, EnvironmentKind>> = Object.freeze({
  'college-tech-fest': 'stage',
  'startup-product-launch': 'office',
  'restaurant-opening-week': 'kitchen',
  'flood-relief-camp': 'hall',
  'film-shoot-weather': 'set',
  'harvest-before-rains': 'field',
});

export const themeEnvironment: Readonly<Record<string, EnvironmentKind>> = Object.freeze({
  stage: 'stage', office: 'office', kitchen: 'kitchen', hall: 'hall',
  set: 'set', field: 'field', workshop: 'workshop', generic: 'workshop',
});

export const environmentAccent: Readonly<Record<EnvironmentKind, string>> = Object.freeze({
  stage: colors.scenarios.techFest.fill, office: colors.scenarios.startup.fill, kitchen: colors.scenarios.restaurant.fill,
  hall: colors.scenarios.flood.fill, set: colors.scenarios.film.fill, field: colors.scenarios.harvest.fill,
  workshop: colors.scenarios.custom.fill,
});

export function resolveScenarioEnvironment(scenarioId: string, theme?: string): EnvironmentKind {
  return scenarioEnvironment[scenarioId] || themeEnvironment[theme || ''] || 'workshop';
}

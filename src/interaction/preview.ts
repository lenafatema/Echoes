import type { MeasureRole, Scenario, ScenarioOption } from '../scenarios/schema';

export interface PreviewDescriptor { roles: MeasureRole[]; description: string }

/** Describes only the direction of explicit option effects; it never runs or mutates the engine. */
export function describeOptionPreview(scenario: Scenario, option: ScenarioOption): PreviewDescriptor {
  const byRole = new Map<MeasureRole, string>();
  for (const effect of option.effects) {
    const measure = scenario.measures.find(item => item.key === effect.measure);
    if (!measure || effect.delta === 0) continue;
    const up = effect.delta > 0;
    const direction = measure.role === 'resources'
      ? (up ? 'resources may increase' : 'resources may decrease')
      : measure.role === 'time'
        ? (up ? 'more time may remain' : 'less time may remain')
        : measure.role === 'people'
          ? (up === measure.higherIsBetter ? 'team confidence may improve' : 'team confidence may weaken')
          : (up === measure.higherIsBetter ? 'progress may advance' : 'progress may slow');
    byRole.set(measure.role, direction);
  }
  const roles = [...byRole.keys()];
  return { roles, description: roles.length ? `Preview: ${[...byRole.values()].join('; ')}.` : 'Preview: this choice has no direct measure change.' };
}

import type { Run } from '../engine/engine';
import type { Scenario } from '../scenarios/schema';

export function improvedMeasures(scenario: Scenario, run: Run, step = run.decisions.length): string[] {
  const byMeasure = new Map<string, number>();
  for (const event of run.events) if (event.step === step) for (const change of event.changes) byMeasure.set(change.measure, (byMeasure.get(change.measure) || 0) + change.delta);
  return scenario.measures.filter(measure => {
    const delta = byMeasure.get(measure.key) || 0;
    return measure.higherIsBetter ? delta > 0 : delta < 0;
  }).map(measure => measure.key);
}

export function chainCount(scenario: Scenario, run: Run, step = run.decisions.length) { return improvedMeasures(scenario, run, step).length; }

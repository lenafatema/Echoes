import type { Run } from '../engine/engine';
import type { Scenario } from '../scenarios/schema';

export interface DecisionImpact { step: number; optionId: string; title: string; benefit: number; cost: number }

/** Scores recorded effects by normalized metric movement, respecting each measure's polarity. */
export function decisionImpacts(scenario: Scenario, run: Run): DecisionImpact[] {
  const options = run.events.filter(event => event.optionId);
  return options.map(optionEvent => {
    const measureTotals = new Map<string, number>();
    for (const event of run.events) if (event.step === optionEvent.step) for (const change of event.changes) measureTotals.set(change.measure, (measureTotals.get(change.measure) || 0) + change.delta);
    let benefit = 0, cost = 0;
    for (const [key, delta] of measureTotals) {
      const measure = scenario.measures.find(item => item.key === key); if (!measure || !delta) continue;
      const range = Math.max(1e-9, measure.domain[1] - measure.domain[0]);
      const signed = (measure.higherIsBetter ? delta : -delta) / range * (scenario.scoreWeights[key] || 1);
      if (signed > 0) benefit += signed; else cost += -signed;
    }
    return { step: optionEvent.step, optionId: optionEvent.optionId!, title: optionEvent.title, benefit, cost };
  }).sort((a,b)=>a.step-b.step);
}

export function bestAndCostliestDecision(scenario: Scenario, run: Run) {
  const rows = decisionImpacts(scenario, run);
  const byBenefit = [...rows].sort((a,b)=>(b.benefit-b.cost)-(a.benefit-a.cost)||a.step-b.step);
  const byCost = [...rows].sort((a,b)=>(b.cost-b.benefit)-(a.cost-a.benefit)||a.step-b.step);
  return { best: byBenefit[0] || null, costliest: byCost[0] || null, impacts: rows };
}

import type { Scenario, ScenarioOption } from '../scenarios/schema';
import { restoreRun, type Run } from '../engine/engine.ts';
import type { GameTool, ToolCharges } from './types';

export const STARTING_CHARGES: ToolCharges = { foresight:2, rewind:1, advisor:1 };
export function spendCharge(charges: ToolCharges, tool: GameTool): ToolCharges | null {
  if (charges[tool] <= 0) return null;
  return { ...charges, [tool]: charges[tool] - 1 };
}
export function rewindLatestDecision(run: Run): Run | null {
  if (run.history.length <= 1 || run.decisions.length === 0) return null;
  return restoreRun(run, run.history.length - 2);
}

const advisorBias = {
  'The Steward': { resources:1.05, time:1.05, people:1.25, progress:.9, downside:1.25 },
  'The Visionary': { resources:.85, time:.85, people:1.1, progress:1.5, downside:.8 },
  'The Treasurer': { resources:1.7, time:.95, people:.75, progress:.7, downside:1.1 },
} as const;
export type AdvisorName = keyof typeof advisorBias;
export function advisorFor(s: Scenario, options: ScenarioOption[], advisor: AdvisorName) {
  const bias = advisorBias[advisor];
  const ranked = options.map((option,index) => {
    const score = option.effects.reduce((sum,effect) => {
      const measure = s.measures.find(m => m.key === effect.measure);
      if (!measure) return sum;
      const span = Math.max(1,measure.domain[1]-measure.domain[0]);
      const directional = (measure.higherIsBetter ? effect.delta : -effect.delta) / span;
      const weight = bias[measure.role];
      return sum + directional * weight * (directional < 0 ? bias.downside : 1);
    },0);
    return { option, score, index };
  }).sort((a,b)=>b.score-a.score || a.index-b.index);
  const choice = ranked[0];
  const effects = choice?.option.effects.map(effect => {
    const measure = s.measures.find(m=>m.key===effect.measure);
    if (!measure || effect.delta===0) return null;
    return `${measure.label} ${measure.higherIsBetter === (effect.delta > 0) ? 'may improve' : 'may worsen'}`;
  }).filter(Boolean) || [];
  return { advisor, bias: advisor === 'The Steward' ? 'Cautious' : advisor === 'The Visionary' ? 'Ambitious' : 'Thrifty', optionId:choice?.option.id||null, optionTitle:choice?.option.title||null,
    reasoning: effects.length ? `Preference based on recorded effects: ${effects.join('; ')}. This is a preference, not a guaranteed outcome.` : 'The available effects do not support a confident recommendation.' };
}

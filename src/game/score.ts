import type { Scenario } from '../scenarios/schema';
import type { MissionConfig, ScoreResult, ToolCharges } from './types';
import { rankForScore } from './ranks.ts';
import { evaluateStars } from './stars.ts';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export function normalizedMeasure(s: Scenario, state: Record<string, number>, key: string): number {
  const measure = s.measures.find(item => item.key === key);
  if (!measure || !Number.isFinite(state[key])) return 0;
  const [low, high] = measure.domain;
  if (!(high > low)) return 0;
  const fraction = clamp01((state[key] - low) / (high - low));
  return measure.higherIsBetter ? fraction : 1 - fraction;
}
export function scoreRun(s: Scenario, state: Record<string, number>, mission: MissionConfig, options: { stars?: number; charges?: ToolCharges; startState?: Record<string, number>; completed?: boolean; decisions?: number } = {}): ScoreResult {
  const criteria = evaluateStars(s, state, options.decisions ?? s.steps, options.completed ?? false, mission);
  const stars = options.stars ?? criteria.count;
  const roles = { resources:0, time:0, people:0, progress:0 };
  for (const measure of s.measures) roles[measure.role] += normalizedMeasure(s, state, measure.key);
  const charges = options.charges || {foresight:2,rewind:1,advisor:1};
  const chargeTotal = Math.max(1, 4);
  const unusedTools = clamp01((charges.foresight + charges.rewind + charges.advisor) / chargeTotal);
  const components = {
    resources: roles.resources * mission.weights.resources * 100,
    time: roles.time * mission.weights.time * 100,
    people: roles.people * mission.weights.people * 100,
    progress: roles.progress * mission.weights.progress * 100,
    stars: clamp01(stars / 3) * mission.weights.stars * 100,
    unusedTools: unusedTools * mission.weights.unusedTools * 100,
  };
  const score = Math.max(0, Math.min(100, Math.round(Object.values(components).reduce((a,b)=>a+b,0))));
  return { score, components, ...rankForScore(score, mission) };
}

export function scorePreview(s: Scenario, state: Record<string, number>, mission: MissionConfig, charges: ToolCharges) {
  return scoreRun(s,state,mission,{stars:0,charges,completed:false,decisions:0});
}

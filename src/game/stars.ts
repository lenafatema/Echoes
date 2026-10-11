import type { Scenario } from '../scenarios/schema';
import type { Criterion, MissionConfig, StarEvaluation, StarResult } from './types';

function evaluateCriteria(s: Scenario, state: Record<string, number>, criteria: Criterion[]): StarResult {
  const unmet = criteria.flatMap(c => {
    const measure = s.measures.find(m => m.key === c.measure);
    const value = state[c.measure];
    if (!measure || !Number.isFinite(value)) return [`${c.description} (measure unavailable)`];
    if (c.min !== undefined && value < c.min) return [`${c.description}; final ${measure.label}: ${value}`];
    if (c.max !== undefined && value > c.max) return [`${c.description}; final ${measure.label}: ${value}`];
    return [];
  });
  return { earned: unmet.length === 0, unmet };
}

export function evaluateStars(s: Scenario, state: Record<string, number>, decisions: number, completed: boolean, mission: MissionConfig): StarEvaluation {
  const complete = completed && decisions >= s.steps;
  const completion: StarResult = { earned: complete, unmet: complete ? [] : [`Complete ${s.steps} decisions; recorded ${decisions}`] };
  const missionResult = evaluateCriteria(s, state, mission.mission);
  const masteryResult = evaluateCriteria(s, state, mission.mastery);
  return { completion, mission: missionResult, mastery: masteryResult, count: Number(completion.earned) + Number(missionResult.earned) + Number(masteryResult.earned) };
}

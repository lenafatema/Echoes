import type { RunRecord } from './types';
import type { RewardFeedback } from '../environment/types';

/** Presentation cues are derived once from a newly committed completion record. */
export function rewardFeedbackForCompletion(
  record: RunRecord,
  previousRecords: readonly RunRecord[],
  previousBestStars: number,
  newBest: boolean,
  newAchievements: readonly string[],
): RewardFeedback[] {
  const result: RewardFeedback[] = [];
  const priorForScenario = previousRecords.filter(item => item.scenarioId === record.scenarioId);
  if (record.stars > previousBestStars) result.push({ id: `${record.id}:star`, kind: 'star' });
  if (!priorForScenario.some(item => item.rank === record.rank)) result.push({ id: `${record.id}:rank`, kind: 'rank' });
  if (newAchievements.length) result.push({ id: `${record.id}:achievement`, kind: 'achievement' });
  if (newBest) result.push({ id: `${record.id}:personal-best`, kind: 'personal-best' });
  return result;
}

/** Returns only cue IDs not already presented by the persistent room renderer. */
export function unpresentedRewardFeedback(previousIds: ReadonlySet<string>, feedbacks: readonly RewardFeedback[]): RewardFeedback[] {
  return feedbacks.filter(item => !previousIds.has(item.id));
}

import type { MissionConfig, Rank } from './types';
const order: Rank[] = ['Bronze','Silver','Gold','Platinum'];
export function rankForScore(score: number, config: MissionConfig) {
  const achieved = order.filter(rank => score >= config.ranks[rank]);
  const rank = achieved[achieved.length - 1] || 'Bronze';
  const nextRank = order[order.indexOf(rank) + 1] || null;
  return { rank, nextRank, nextThreshold: nextRank ? config.ranks[nextRank] : null };
}

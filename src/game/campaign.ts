import { scenarios } from '../scenarios/index.ts';
export function isScenarioUnlocked(index: number, bestStars: Record<string,number>, freePlay: boolean) {
  if (freePlay || index < 2) return true;
  return scenarios.slice(0,index).some(s => (bestStars[s.id] || 0) > 0);
}
export function campaignStars(bestStars: Record<string,number>) {
  return Math.min(18,scenarios.reduce((sum,s)=>sum+Math.max(0,Math.min(3,bestStars[s.id]||0)),0));
}

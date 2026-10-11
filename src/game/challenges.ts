import type { Scenario } from '../scenarios/schema';
import type { DailyChallenge } from './types';
export const GAME_VERSION = '1';
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function hash(text:string) { let value=2166136261; for(const char of text) value=Math.imul(value^char.charCodeAt(0),16777619); return value>>>0; }
export function dailyChallengeFor(date: Date, available: Scenario[]): DailyChallenge {
  const day=localDate(date);const seed=hash(`${GAME_VERSION}:${day}`);const scenario=available[seed%available.length];
  const resource=scenario.measures.find(m=>m.role==='resources');
  const delta=resource?-(resource.domain[1]-resource.domain[0])*.06:0;
  return {date:day,scenarioId:scenario.id,modifier:{measure:resource?.key||'',delta,label:resource?`${resource.label} starts 6% below its usual level`:'Standard starting conditions'}};
}
export function applyChallenge(s:Scenario, challenge:DailyChallenge): Scenario {
  if(s.id!==challenge.scenarioId)return s;
  const measure=s.measures.find(m=>m.key===challenge.modifier.measure);
  if(!measure)return s;
  const [lo,hi]=measure.domain;
  const value=Math.max(lo,Math.min(hi,s.startingState[measure.key]+challenge.modifier.delta));
  return {...s,startingState:{...s.startingState,[measure.key]:value}};
}

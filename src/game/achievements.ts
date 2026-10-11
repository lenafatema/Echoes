import type { Scenario } from '../scenarios/schema';
import type { RunRecord } from './types';
export const achievementDefinitions = [
  {id:'steady-hand',title:'Steady Hand',description:'Finish with every 0–100 people or progress measure above 50.'},
  {id:'penny-wise',title:'Penny Wise',description:'Finish with more than 40% of the starting resources remaining.'},
  {id:'no-regrets',title:'No Regrets',description:'Complete a run without rewinding.'},
  {id:'both-ways',title:'Both Ways',description:'Complete two distinct first-decision paths for the same scenario.'},
  {id:'foresighted',title:'Foresighted',description:'Finish with at least two stars without using Foresight.'},
] as const;
export function achievementEvidence(s:Scenario,record:RunRecord,previous:RunRecord[]) {
  const earned:string[]=[];
  const applicable=s.measures.filter(m=>(m.role==='people'||m.role==='progress')&&m.domain[0]===0&&m.domain[1]===100);
  if(applicable.length&&applicable.every(m=>record.finalState[m.key]>50))earned.push('steady-hand');
  const resource=s.measures.find(m=>m.role==='resources');
  const start=resource?record.startState[resource.key]:undefined;
  const end=resource?record.finalState[resource.key]:undefined;
  if(start&&end!==undefined&&end>start*.4)earned.push('penny-wise');
  if(record.rewinds===0)earned.push('no-regrets');
  const distinct=previous.some(r=>r.scenarioId===record.scenarioId&&r.decisions[0]!==record.decisions[0]&&r.decisions.length>=s.steps);
  if(record.bothPathsFinished||distinct)earned.push('both-ways');
  if(record.stars>=2&&!record.toolLog.some(entry=>entry.tool==='foresight'))earned.push('foresighted');
  return earned;
}

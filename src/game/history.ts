import { applyDecision, newRun, optionsFor, replayAlternative, type PathId, type Run } from '../engine/engine.ts';
import type { Scenario } from '../scenarios/schema';
import type { RunRecord, ReplayResult } from './types';
import { scoreRun } from './score.ts';
import { missionFor } from './missions.ts';
import { evaluateStars } from './stars.ts';
import { rankForScore } from './ranks.ts';
import { applyChallenge } from './challenges.ts';
import type { RunSession } from './types';
import type { GameProgress, ToolCharges } from './types';
import { achievementEvidence } from './achievements.ts';
import { emptyProgress } from './persistence.ts';
import { spendCharge, STARTING_CHARGES } from './tools.ts';

export const RUN_HISTORY_LIMIT=50;

/**
 * Complete a real alternative through the deterministic engine. When several
 * completions are valid, prefer the one that differs most from the recorded
 * final state across normalized scenario measures; option order breaks ties.
 */
export function mostDistinctAlternative(s:Scenario,source:Run,id:PathId):Run|null {
  if(source.status!=='completed'||source.decisions.length===0)return null;
  const initial=newRun(s,id);
  const firstChoices=optionsFor(s,initial).filter(option=>option.id!==source.decisions[0]);
  const completed:Run[]=[];
  const visit=(run:Run)=>{
    if(run.status==='completed'){completed.push(run);return;}
    for(const option of optionsFor(s,run))visit(applyDecision(s,run,option.id));
  };
  for(const option of firstChoices)visit(replayAlternative(s,source,id,option.id));
  if(!completed.length)return null;
  const distance=(candidate:Run)=>s.measures.reduce((sum,measure)=>{
    const span=measure.domain[1]-measure.domain[0];
    return sum+(span>0?Math.abs(candidate.state[measure.key]-source.state[measure.key])/span:0);
  },0);
  return completed.reduce((best,candidate)=>distance(candidate)>distance(best)?candidate:best);
}

export function recordCompletedRun(s:Scenario,run:Run,session:RunSession,previous:RunRecord[],bothPathsFinished:boolean):RunRecord {
  const mission=missionFor(s.id)!;
  const starEvaluation=evaluateStars(s,run.state,run.decisions.length,run.status==='completed',mission);
  const score=scoreRun(s,run.state,mission,{stars:starEvaluation.count,charges:session.charges,completed:true,decisions:run.decisions.length}).score;
  const rank=rankForScore(score,mission).rank;
  const record:RunRecord={id:session.runKey,scenarioId:s.id,completedAt:new Date().toISOString(),pathId:run.id,score,rank,stars:starEvaluation.count,starEvaluation,decisions:[...run.decisions],toolLog:[...session.toolLog],rewinds:session.rewinds,daily:session.daily?{...session.daily}:null,bothPathsFinished,startState:{...session.startState},finalState:{...run.state},outcome:run.outcome,replayMatches:true};
  return record;
}
export function replayRecord(s:Scenario,record:RunRecord):ReplayResult {
  try {
    const challenge=record.daily;
    const source=challenge?applyChallenge(s,challenge):s;
    const starting={...source,startingState:{...record.startState}};
    let run=newRun(starting,record.pathId);
    for(const optionId of record.decisions) run=applyDecision(starting,run,optionId);
    const expectedKeys=Object.keys(source.startingState).sort();
    const matches=run.status==='completed'&&Object.keys(record.finalState).sort().join('|')===expectedKeys.join('|')&&Object.keys(record.startState).sort().join('|')===expectedKeys.join('|')&&expectedKeys.every(key=>run.state[key]===record.finalState[key])&&run.outcome===record.outcome;
    return {run,matches,reason:matches?undefined:'Replay differs from the recorded final state under the current engine.'};
  } catch(error) { return {run:null,matches:false,reason:error instanceof Error?error.message:'Replay failed under the current engine.'}; }
}

/** Rebuild progression from engine-replayed completed runs; persisted scores and stars are treated as caches. */
export function reconcileProgress(saved:GameProgress,scenarios:Scenario[]):GameProgress {
  let derived:GameProgress={...emptyProgress(),sessions:saved.sessions,tutorialComplete:saved.tutorialComplete,soundEnabled:saved.soundEnabled};
  const verifiedRecords:RunRecord[]=[];
  const chronological=[...saved.runs].sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
  for(const record of chronological){
    const scenario=scenarios.find(item=>item.id===record.scenarioId);
    if(!scenario){verifiedRecords.push({...record,replayMatches:false});continue;}
    const replay=replayRecord(scenario,record);
    if(!replay.matches||!replay.run){verifiedRecords.push({...record,replayMatches:false});continue;}
    const mission=missionFor(scenario.id);
    if(!mission){verifiedRecords.push({...record,replayMatches:false});continue;}
    let charges:ToolCharges={...STARTING_CHARGES};
    let chargeHistoryValid=true;
    for(const entry of record.toolLog){const next=spendCharge(charges,entry.tool);if(!next){chargeHistoryValid=false;break;}charges=next;}
    if(!chargeHistoryValid){verifiedRecords.push({...record,replayMatches:false});continue;}
    const run=replay.run;
    const starEvaluation=evaluateStars(scenario,run.state,run.decisions.length,run.status==='completed',mission);
    const score=scoreRun(scenario,run.state,mission,{stars:starEvaluation.count,charges,completed:true,decisions:run.decisions.length}).score;
    const recomputed:RunRecord={...record,score,rank:rankForScore(score,mission).rank,stars:starEvaluation.count,starEvaluation,decisions:[...run.decisions],finalState:{...run.state},outcome:run.outcome,replayMatches:true};
    const prevScenarioRuns=derived.runs.filter(item=>item.scenarioId===scenario.id);
    const distinctOther=prevScenarioRuns.some(item=>item.decisions[0]!==recomputed.decisions[0]&&item.decisions.length>=scenario.steps);
    const withBranchEvidence={...recomputed,bothPathsFinished:recomputed.bothPathsFinished&&distinctOther};
    derived=awardCompletedRun(derived,withBranchEvidence,scenario).progress;
    verifiedRecords.push(withBranchEvidence);
  }
  const derivedIds=new Set(derived.runs.map(record=>record.id));
  const invalid=verifiedRecords.filter(record=>!record.replayMatches||!derivedIds.has(record.id));
  return {...derived,runs:[...derived.runs.filter(record=>record.replayMatches),...invalid].sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)).slice(0,50)};
}
export function decisionSequence(s:Scenario,ids:string[]) { return ids.map(id=>s.options.find(o=>o.id===id)?.title||`Unknown option (${id})`); }
export function awardCompletedRun(progress:GameProgress,record:RunRecord,scenario:Scenario) {
  if(progress.runs.some(item=>item.id===record.id))return {progress,newBest:false,newAchievements:[] as string[]};
  const oldBest=progress.personalBests[record.scenarioId];const newBest=!oldBest||record.score>oldBest.score;
  const bestStars={...progress.bestStars,[record.scenarioId]:Math.max(progress.bestStars[record.scenarioId]||0,record.stars)};
  const nextRecords=[record,...progress.runs].slice(0,RUN_HISTORY_LIMIT);
  const already=new Set(progress.achievements.map(a=>a.id));
  const fresh=achievementEvidence(scenario,record,progress.runs).filter(id=>!already.has(id));
  const titles:Record<string,string>={'steady-hand':'Steady Hand','penny-wise':'Penny Wise','no-regrets':'No Regrets','both-ways':'Both Ways','foresighted':'Foresighted'};
  const achievements=[...progress.achievements,...fresh.map(id=>({id,earnedAt:record.completedAt,evidence:`${scenario.title} · ${titles[id]}`}))];
  const next:GameProgress={...progress,runs:nextRecords,bestStars,personalBests:newBest?{...progress.personalBests,[record.scenarioId]:{score:record.score,recordId:record.id}}:progress.personalBests,achievements};
  return {progress:next,newBest,newAchievements:fresh.map(id=>titles[id])};
}

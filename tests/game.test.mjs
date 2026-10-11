import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../src/scenarios/index.ts';
import { applyDecision, newRun, optionsFor, restoreRun } from '../src/engine/engine.ts';
import { describeOptionPreview } from '../src/interaction/preview.ts';
import { missions } from '../src/game/missions.ts';
import { evaluateStars } from '../src/game/stars.ts';
import { scoreRun } from '../src/game/score.ts';
import { rankForScore } from '../src/game/ranks.ts';
import { advisorFor, rewindLatestDecision, spendCharge, STARTING_CHARGES } from '../src/game/tools.ts';
import { campaignStars, isScenarioUnlocked } from '../src/game/campaign.ts';
import { applyChallenge, dailyChallengeFor } from '../src/game/challenges.ts';
import { achievementEvidence } from '../src/game/achievements.ts';
import { awardCompletedRun, mostDistinctAlternative, recordCompletedRun, replayRecord } from '../src/game/history.ts';
import { emptyProgress, loadProgress, saveProgress, sanitizeProgress, retainSessions } from '../src/game/persistence.ts';
import { firstValidClockChoice, startDecisionClock } from '../src/game/clock.ts';
import { reconcileProgress } from '../src/game/history.ts';
import { makeRunSession } from '../src/game/store.ts';

function finish(s, choose=(run)=>optionsFor(s,run)[0]) {
  let run=newRun(s);
  while(run.status!=='completed') run=applyDecision(s,run,choose(run).id);
  return run;
}

test('score is deterministic, normalized, bounded, and leaves inputs untouched including zero domains',()=>{
  for(const s of scenarios){const run=finish(s);const before=structuredClone(run.state);const charges={...STARTING_CHARGES};const result=scoreRun(s,run.state,missions[s.id],{charges,completed:true,decisions:run.decisions.length});assert.equal(result.score,scoreRun(s,run.state,missions[s.id],{charges,completed:true,decisions:run.decisions.length}).score);assert.ok(result.score>=0&&result.score<=100);assert.deepEqual(run.state,before);}
  const s=scenarios[0];const zero=scoreRun(s,{budget:0,days:0,morale:0,readiness:0},missions[s.id]);assert.ok(Number.isFinite(zero.score));
});

test('all scenarios define attainable completion stars with real schema measures',()=>{
  for(const s of scenarios){const config=missions[s.id];assert.ok(config);for(const c of [...config.mission,...config.mastery])assert.ok(s.measures.some(m=>m.key===c.measure),`${s.id}:${c.measure}`);const result=evaluateStars(s,finish(s).state,s.steps,true,config);assert.equal(result.completion.earned,true);assert.ok(result.count>=1&&result.count<=3);}
});

test('all four scenario rank thresholds are ordered and produce the configured rank',()=>{
  for(const s of scenarios){const config=missions[s.id];const thresholds=Object.values(config.ranks);assert.equal(thresholds.length,4);assert.deepEqual(thresholds,[...thresholds].sort((a,b)=>a-b));for(const [name,threshold] of Object.entries(config.ranks))assert.equal(rankForScore(threshold,config).rank,name);}
});

test('campaign unlocks first two, gates later situations on earlier stars, and free play is temporary',()=>{
  const none={};assert.equal(isScenarioUnlocked(0,none,false),true);assert.equal(isScenarioUnlocked(1,none,false),true);assert.equal(isScenarioUnlocked(2,none,false),false);assert.equal(isScenarioUnlocked(5,none,true),true);assert.equal(isScenarioUnlocked(5,{'restaurant-opening-week':1},false),true);assert.equal(campaignStars({'college-tech-fest':3,'startup-product-launch':3,'restaurant-opening-week':8}),9);
});

test('daily challenge is stable for a local date and modifier stays in the scenario domain',()=>{
  const date=new Date(2026,9,11,12);const a=dailyChallengeFor(date,scenarios);const b=dailyChallengeFor(date,scenarios);assert.deepEqual(a,b);const s=scenarios.find(item=>item.id===a.scenarioId);const modified=applyChallenge(s,a);const m=s.measures.find(item=>item.key===a.modifier.measure);assert.ok(modified.startingState[m.key]>=m.domain[0]);assert.notEqual(modified.startingState[m.key],s.startingState[m.key]);assert.deepEqual(s.startingState,scenarios.find(item=>item.id===s.id).startingState);
});

test('achievement rules use completed-run evidence and distinguish tool and path history',()=>{
  const s=scenarios.find(item=>item.id==='college-tech-fest');const base=finish(s);const record={id:'r1',scenarioId:s.id,completedAt:'2026-01-01T00:00:00.000Z',pathId:'A',score:60,rank:'Gold',stars:2,starEvaluation:{},decisions:base.decisions,toolLog:[],rewinds:0,daily:null,bothPathsFinished:false,startState:{...s.startingState},finalState:{...base.state},outcome:base.outcome,replayMatches:true};
  const earned=achievementEvidence(s,record,[]);assert.ok(earned.includes('no-regrets'));assert.ok(earned.includes('foresighted'));assert.ok(!earned.includes('both-ways'));
  const other={...record,id:'r2',decisions:['sponsor','scale','charge']};assert.ok(achievementEvidence(s,other,[record]).includes('both-ways'));
});

test('Foresight only describes listed directions and does not mutate simulation or history',()=>{
  for(const s of scenarios){const run=newRun(s);const before=structuredClone(run);const option=optionsFor(s,run)[0];const preview=describeOptionPreview(s,option);assert.match(preview.description,/may/);assert.deepEqual(run,before);assert.doesNotMatch(preview.description,/₹\s?\d|\b\d+%/);}
});

test('Advisor is deterministic, identifies its bias, and does not mutate engine state',()=>{
  for(const s of scenarios){const run=newRun(s);const before=structuredClone(run);const options=optionsFor(s,run);const one=advisorFor(s,options,'The Steward');assert.deepEqual(one,advisorFor(s,options,'The Steward'));assert.equal(one.bias,'Cautious');assert.ok(options.some(o=>o.id===one.optionId));assert.deepEqual(run,before);}
});

test('rewind restores exact previous snapshot and charge is consumed only for a valid rewind',()=>{
  const s=scenarios[0];let run=newRun(s);run=applyDecision(s,run,optionsFor(s,run)[0].id);const prior=restoreRun(run,0);const rewound=rewindLatestDecision(run);assert.deepEqual(rewound.state,prior.state);assert.deepEqual(rewound.events,prior.events);assert.deepEqual(rewound.decisions,prior.decisions);assert.deepEqual(rewound.firedRules,prior.firedRules);assert.equal(rewindLatestDecision(newRun(s)),null);const used=spendCharge(STARTING_CHARGES,'rewind');assert.equal(used.rewind,0);assert.equal(spendCharge(used,'rewind'),null);
});

test('replay reconstructs the actual path with the engine and reports mismatches',()=>{
  const s=scenarios[0];const run=finish(s);const session=makeRunSession('test-run',s.startingState);const record=recordCompletedRun(s,run,session,[],false);const replay=replayRecord(s,record);assert.equal(replay.matches,true);assert.deepEqual(replay.run.state,run.state);assert.equal(replayRecord(s,{...record,finalState:{...record.finalState,budget:0}}).matches,false);
});

test('other-path selection keeps the recorded run and chooses the most distinct valid engine completion',()=>{
  const s=scenarios.find(item=>item.id==='college-tech-fest');let source=newRun(s,'A');
  for(const id of ['scale','sponsor','sponsor'])source=applyDecision(s,source,id);
  const before=structuredClone(source);const alternate=mostDistinctAlternative(s,source,'B');
  assert.ok(alternate);assert.equal(alternate.status,'completed');assert.notEqual(alternate.decisions[0],source.decisions[0]);assert.deepEqual(source,before);
  assert.ok(s.measures.some(measure=>alternate.state[measure.key]!==source.state[measure.key]));
  let replay=newRun(s,'B');for(const id of alternate.decisions)replay=applyDecision(s,replay,id);
  assert.deepEqual(alternate.state,replay.state);assert.equal(alternate.outcome,replay.outcome);
});

test('local storage errors use memory fallback; malformed and outdated data resets safely',()=>{
  const progress={...emptyProgress(),bestStars:{'college-tech-fest':2}};const throwing={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};assert.equal(saveProgress(progress,throwing),false);assert.deepEqual(loadProgress(null).bestStars,progress.bestStars);assert.equal(sanitizeProgress({version:8}).runs.length,0);assert.equal(sanitizeProgress({version:1,runs:'bad'}).runs.length,0);assert.equal(loadProgress({getItem(){return '{bad'},setItem(){}}).runs.length,0);
  const malformed={...emptyProgress(),sessions:{'run-bad':{...makeRunSession('run-bad',scenarios[0].startingState),charges:{foresight:-1,rewind:1,advisor:1}}}};assert.equal(Object.keys(sanitizeProgress(malformed).sessions).length,0);const session=makeRunSession('run-keep',scenarios[0].startingState);const retained=retainSessions({...emptyProgress(),sessions:{'run-keep':session,'run-old':session}},new Set(['run-keep']));assert.deepEqual(Object.keys(retained.sessions),['run-keep']);
});

test('run awards are unique, campaign stars cap at the scenario best, and ties do not replace personal best',()=>{
  const s=scenarios[0];const run=finish(s);const session=makeRunSession('once',s.startingState);const record=recordCompletedRun(s,run,session,[],false);let progress=emptyProgress();const awarded=awardCompletedRun(progress,record,s);progress=awarded.progress;assert.equal(awarded.newBest,true);assert.equal(progress.bestStars[s.id],record.stars);const repeat=awardCompletedRun(progress,record,s);assert.equal(repeat.progress,progress);assert.equal(repeat.newBest,false);assert.equal(repeat.newAchievements.length,0);const tie=awardCompletedRun(progress,{...record,id:'tie',completedAt:'2026-01-02T00:00:00.000Z'},s);assert.equal(tie.newBest,false);
});

test('clock timeout chooses the first listed valid option and manual commit wins races',()=>{
  assert.equal(firstValidClockChoice(['first','second'],false),'first');assert.equal(firstValidClockChoice(['first'],true),null);assert.equal(firstValidClockChoice([],false),null);
});

test('decision clock uses injected fake time, pauses while hidden, and expires once',()=>{
  let now=0;let callback=()=>{};let cleared=0;let paused=false;let committed=false;let expiries=0;const ticks=[];
  const scheduler={now:()=>now,setInterval(fn){callback=fn;return 7},clearInterval(id){assert.equal(id,7);cleared++}};
  const clock=startDecisionClock({durationSeconds:1,scheduler,isPaused:()=>paused,isCommitted:()=>committed,onTick:value=>ticks.push(value),onExpire:()=>expiries++});
  now=400;callback();assert.equal(ticks.at(-1),1);paused=true;now=1400;callback();paused=false;clock.refreshBaseline();now=1800;callback();assert.equal(expiries,0);now=2400;callback();assert.equal(expiries,1);assert.equal(cleared,1);
  const race=startDecisionClock({durationSeconds:1,scheduler,isPaused:()=>false,isCommitted:()=>committed,onTick:()=>{},onExpire:()=>expiries++});committed=true;now=4000;callback();assert.equal(expiries,1);race.stop();
});

test('restoration recomputes derived run awards from deterministic engine replay',()=>{
  const s=scenarios[0];const run=finish(s);const session=makeRunSession('restore-derived',s.startingState);const real=recordCompletedRun(s,run,session,[],false);const forged={...real,score:100,rank:'Platinum',stars:3,starEvaluation:{}};const progress={...emptyProgress(),runs:[forged],bestStars:{[s.id]:3},personalBests:{[s.id]:{score:100,recordId:real.id}}};
  const restored=reconcileProgress(progress,scenarios);const expected=scoreRun(s,run.state,missions[s.id],{stars:evaluateStars(s,run.state,run.decisions.length,true,missions[s.id]).count,charges:STARTING_CHARGES,completed:true,decisions:run.decisions.length});
  assert.equal(restored.runs[0].score,expected.score);assert.equal(restored.runs[0].rank,expected.rank);assert.equal(restored.runs[0].stars,evaluateStars(s,run.state,run.decisions.length,true,missions[s.id]).count);assert.deepEqual(progress.runs[0].score,100);assert.equal(restored.personalBests[s.id].score,expected.score);
  const mismatch=reconcileProgress({...progress,runs:[{...forged,finalState:{...forged.finalState,budget:0}}]},scenarios);assert.equal(mismatch.runs[0].replayMatches,false);assert.equal(mismatch.bestStars[s.id],undefined);
});

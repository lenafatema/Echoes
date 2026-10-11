import {scenarios} from '../src/scenarios/index.ts';
import {applyDecision,newRun,optionsFor,scoreOutcome,thresholdApplies,type Run} from '../src/engine/engine.ts';
import {missionFor} from '../src/game/missions.ts';
import {evaluateStars} from '../src/game/stars.ts';
import {scoreRun} from '../src/game/score.ts';
import {STARTING_CHARGES} from '../src/game/tools.ts';
import {checkBalance} from '../src/studio/balance-checker.ts';
import {createCustomSituation,createVariant} from '../src/studio/defaults.ts';
import {exportSituation,importSituation} from '../src/studio/import-export.ts';
const rows=[] as {scenario:string;paths:number;events:number;outcomes:string}[];
for(const s of scenarios){
 let paths=0;const foundEvents=new Set<string>();const outcomes=new Set<string>();
 const visit=(run:Run)=>{for(const e of run.events)foundEvents.add(e.eventId);for(const m of s.measures){const [lo,hi]=m.domain;if(run.state[m.key]<lo||run.state[m.key]>hi)throw new Error(`${s.id}: ${m.label} outside chart domain`);if(m.role==='resources'||m.role==='time')if(run.state[m.key]<0)throw new Error(`${s.id}: negative ${m.label}`)}
  if(run.status==='completed'){paths++;outcomes.add(scoreOutcome(s,run.state));if(run.state[s.measures.find(m=>m.role==='resources')!.key]<0||run.state[s.measures.find(m=>m.role==='time')!.key]<0)throw new Error(`${s.id}: negative final resource/time`);return}
  const options=optionsFor(s,run);if(!options.length)throw new Error(`${s.id}: path cannot reach ending after ${run.decisions.length} choices`);for(const o of options)visit(applyDecision(s,run,o.id));
 };
 visit(newRun(s));
 const required=new Set(s.events.map(e=>e.id));for(const id of required)if(!foundEvents.has(id))throw new Error(`${s.id}: event ${id} is unreachable`);
 for(const label of ['strong','workable','strained'])if(!outcomes.has(label))throw new Error(`${s.id}: outcome ${label} is unreachable (got ${[...outcomes].join(', ')})`);
 if(s.id==='college-tech-fest'){const t=s.thresholds.find(r=>r.id==='supplier-risk')!;if(thresholdApplies(48001,t)||thresholdApplies(48000,t)||!thresholdApplies(47999,t))throw new Error('Supplier risk boundary must be strict below ₹48,000.');}
 rows.push({scenario:s.title,paths,events:foundEvents.size,outcomes:[...outcomes].join(', ')});
}
console.table(rows);

const rankRows=[] as {scenario:string;minimum:number;minimumDecisions:string;minimumTools:string;maximum:number;maximumDecisions:string;thresholds:string;reachable:string;rankExamples:string;stars:string}[];
for(const s of scenarios){
 const mission=missionFor(s.id)!;const scored:{score:number;decisions:string[];tools:string}[]=[];const starCounts=new Set<number>();const missionStars=new Set<boolean>();const masteryStars=new Set<boolean>();
 const walk=(run:Run)=>{if(run.status==='completed'){const stars=evaluateStars(s,run.state,run.decisions.length,true,mission);starCounts.add(stars.count);missionStars.add(stars.mission.earned);masteryStars.add(stars.mastery.earned);for(let f=0;f<=STARTING_CHARGES.foresight;f++)for(let r=0;r<=STARTING_CHARGES.rewind;r++)for(let a=0;a<=STARTING_CHARGES.advisor;a++){const charges={foresight:f,rewind:r,advisor:a};const result=scoreRun(s,run.state,mission,{stars:stars.count,charges,completed:true,decisions:run.decisions.length});scored.push({score:result.score,decisions:run.decisions,tools:`F${2-f}/R${1-r}/A${1-a} spent`});}return}for(const option of optionsFor(s,run))walk(applyDecision(s,run,option.id))};
 walk(newRun(s));const min=scored.reduce((best,current)=>current.score<best.score?current:best,scored[0]);const max=scored.reduce((best,current)=>current.score>best.score?current:best,scored[0]);
 const rankNames=['Bronze','Silver','Gold','Platinum'] as const;
 const witnessByRank=rankNames.map((rank,index)=>{
  const lower=mission.ranks[rank];const upper=rankNames[index+1]?mission.ranks[rankNames[index+1]]:Infinity;
  return {rank,example:scored.find(path=>path.score>=lower&&path.score<upper)};
 });
 const reachable=witnessByRank.filter(item=>item.example).map(item=>item.rank).join(', ');
 const rankExamples=witnessByRank.map(item=>`${item.rank}: ${item.example?`${item.example.score} (${item.example.decisions.join(' → ')}; ${item.example.tools})`:'unreachable'}`).join(' | ');
 rankRows.push({scenario:s.title,minimum:min.score,minimumDecisions:min.decisions.join(' → '),minimumTools:min.tools,maximum:max.score,maximumDecisions:max.decisions.join(' → '),thresholds:JSON.stringify(mission.ranks),reachable,rankExamples,stars:[0,1,2,3].filter(count=>starCounts.has(count)).join(', ')});
 for(const item of witnessByRank)if(!item.example)throw new Error(`${s.id}: ${item.rank} threshold band is unreachable (minimum ${min.score}, maximum ${max.score}, thresholds ${JSON.stringify(mission.ranks)})`);
 if(!missionStars.has(true))throw new Error(`${s.id}: mission star is unreachable with the actual engine.`);
 if(!masteryStars.has(true))throw new Error(`${s.id}: mastery star is unreachable with the actual engine.`);
}
console.log('Game score range and rank reachability (exhaustive deterministic completed paths; base starting state; optional legal tool-use counts included in score bounds). Rank reachability uses actual score bands:');console.table(rankRows);


const studioCustom=createCustomSituation();
const studioImported=importSituation(exportSituation(studioCustom));
const studioFixtures=[
 ...scenarios.map(s=>({label:`Built-in · ${s.title}`,candidate:s})),
 {label:`Custom · ${studioCustom.title}`,candidate:studioCustom},
 {label:`Imported · ${studioImported.title}`,candidate:studioImported},
 ...scenarios.map(s=>({label:`Edited · ${s.title}`,candidate:createVariant(s)}))
];
const studioRows=studioFixtures.map(({label,candidate})=>{
 const report=checkBalance(candidate);
 if(!report.valid)throw new Error(`${label}: balance check failed: ${report.issues.filter(i=>i.severity==='error').map(i=>i.message).join('; ')}`);
 if(report.decisions.some(item=>!item.reachable)||report.options.some(item=>!item.reachable))throw new Error(`${label}: a required decision or option is unreachable.`);
 return {situation:label,paths:report.pathCount,best:report.best,median:report.median,worst:report.worst,outcomes:report.outcomes.join(', '),events:report.events.filter(item=>item.reachable).length+'/'+report.events.length,triggers:report.triggers.filter(item=>item.reachable).length+'/'+report.triggers.length,hardErrors:report.issues.filter(i=>i.severity==='error').length};
});
console.log('Scenario Studio balance validation (engine-backed exhaustive reachable-path enumeration; warnings such as clamped attempted effects are reported in Studio):');
console.table(studioRows);

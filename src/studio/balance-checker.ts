import { applyDecision, newRun, optionsFor, thresholdApplies, type Run } from '../engine/engine.ts';
import type { Scenario } from '../scenarios/schema.ts';
import { validateScenarioShape, validateSituation } from './schema.ts';
import type { StudioSituation, ValidationIssue } from './types';

export interface BalancePath { decisions:string[]; state:Record<string,number>; outcome:string|null; score:number; run:Run }
export interface BalanceReport { valid:boolean; issues:ValidationIssue[]; pathCount:number; paths:BalancePath[]; best:number|null; median:number|null; worst:number|null; outcomes:string[]; withinDomains:boolean; nonNegativeResourcesAndTime:boolean; decisions:{step:number;reachable:boolean}[]; options:{id:string;reachable:boolean}[]; events:{id:string;reachable:boolean}[]; triggers:{id:string;reachable:boolean}[]; thresholds:{id:string;reachable:boolean}[] }
export function medianScore(values:number[]){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
function pathScore(s:Scenario,state:Record<string,number>){let numerator=0,total=0;for(const m of s.measures){const w=Math.max(0,s.scoreWeights[m.key]||0);const [lo,hi]=m.domain;const value=hi>lo?Math.max(0,Math.min(1,(state[m.key]-lo)/(hi-lo))):0;numerator+=value*w;total+=w;}return total?Math.round(100*numerator/total):0;}
function projectionIssues(s:Scenario,source:Run,optionId:string):ValidationIssue[]{
  const issues:ValidationIssue[]=[];
  const projected={...source.state};
  const inspect=(effect:{measure:string;delta:number},path:string)=>{
    const m=s.measures.find(x=>x.key===effect.measure);if(!m)return;
    const next=projected[effect.measure]+effect.delta;const clamped=Math.min(m.domain[1],Math.max(m.domain[0],next));
    if(next<m.domain[0]||next>m.domain[1])issues.push({path,message:`${m.label} can cross its ${m.domain[0]}–${m.domain[1]} domain; the engine clamps the recorded value.`,severity:'warning'});
    if((m.role==='resources'||m.role==='time')&&clamped<0)issues.push({path,message:`${m.label} can finish negative after the engine applies its domain clamp.`,severity:'error'});
    projected[effect.measure]=clamped;
  };
  const option=s.options.find(x=>x.id===optionId);if(option)option.effects.forEach((effect,index)=>inspect(effect,`options.${optionId}.effects.${index}.delta`));
  s.drift.forEach((effect,index)=>inspect(effect,`drift.${index}.delta`));
  for(const threshold of s.thresholds){
    if(source.firedRules.includes(threshold.id)||!thresholdApplies(projected[threshold.measure],threshold))continue;
    threshold.effects.forEach((effect,index)=>inspect(effect,`thresholds.${threshold.id}.effects.${index}.delta`));
  }
  return issues;
}
export function checkBalance(candidate:Scenario|StudioSituation):BalanceReport {
  const situation='scenario'in candidate?candidate:null;const s=situation?.scenario||candidate as Scenario;
  const validation=situation?validateSituation(situation):validateScenarioShape(s);
  const issues=[...validation.issues];
  if(issues.some(issue=>issue.severity==='error'))return{valid:false,issues,pathCount:0,paths:[],best:null,median:null,worst:null,outcomes:[],withinDomains:false,nonNegativeResourcesAndTime:false,decisions:Array.from({length:s.steps||3},(_,i)=>({step:i+1,reachable:false})),options:(s.options||[]).map(x=>({id:x.id,reachable:false})),events:(s.events||[]).map(x=>({id:x.id,reachable:false})),triggers:(s.triggers||[]).map(x=>({id:x.id,reachable:false})),thresholds:(s.thresholds||[]).map(x=>({id:x.id,reachable:false}))};
  const paths:BalancePath[]=[];const optionReach=new Set<string>();const triggerReach=new Set<string>();const eventReach=new Set<string>();const thresholdReach=new Set<string>();const decisionReach=new Set<number>();
  const visit=(run:Run)=>{
    for(const record of run.events)eventReach.add(record.eventId);
    for(const threshold of s.thresholds)if(run.firedRules.includes(threshold.id))thresholdReach.add(threshold.id);
    if(run.status==='completed'){
      for(const measure of s.measures)if((measure.role==='resources'||measure.role==='time')&&run.state[measure.key]<0)issues.push({path:`measures.${measure.key}.domain`,message:`A completed path ends with negative ${measure.label}.`,severity:'error'});
      paths.push({decisions:[...run.decisions],state:{...run.state},outcome:run.outcome,score:pathScore(s,run.state),run});return;
    }
    const stage=run.decisions.length+1;decisionReach.add(stage);
    for(const option of optionsFor(s,run)){
      optionReach.add(option.id);
      issues.push(...projectionIssues(s,run,option.id));
      const next=applyDecision(s,run,option.id);
      for(const trigger of s.triggers)if(trigger.step===stage&&trigger.optionId===option.id&&next.firedRules.includes(trigger.id))triggerReach.add(trigger.id);
      visit(next);
    }
  };
  try{visit(newRun(s));}catch(error){issues.push({path:'scenario',message:error instanceof Error?error.message:'The scenario could not be replayed.',severity:'error'});}
  if(!paths.length)issues.push({path:'options',message:'No complete valid decision sequence reaches an ending.',severity:'error'});
  const distinctIssues=new Map(issues.map(i=>[`${i.path}:${i.message}`,i]));
  for(const option of s.options)if(!optionReach.has(option.id))distinctIssues.set(`options.${option.id}`,{path:`options.${option.id}`,message:`Option “${option.title}” is unreachable under the engine's availability rules.`,severity:'error'});
  for(const trigger of s.triggers)if(!triggerReach.has(trigger.id))distinctIssues.set(`triggers.${trigger.id}`,{path:`triggers.${trigger.id}`,message:`Trigger ${trigger.id} did not fire on an explored path.`,severity:'warning'});
  for(const threshold of s.thresholds)if(!thresholdReach.has(threshold.id))distinctIssues.set(`thresholds.${threshold.id}.unreachable`,{path:`thresholds.${threshold.id}`,message:`Threshold ${threshold.id} did not activate on an explored path.`,severity:'warning'});
  for(const event of s.events)if(!eventReach.has(event.id))distinctIssues.set(`events.${event.id}`,{path:`events.${event.id}`,message:`Event “${event.title}” is not reached on an explored path.`,severity:'warning'});
  for(let step=1;step<=s.steps;step++)if(!decisionReach.has(step))distinctIssues.set(`steps.${step}`,{path:`steps.${step}`,message:`Decision stage ${step} is unreachable.`,severity:'error'});
  const outcomeSet=[...new Set(paths.map(p=>p.outcome).filter((x):x is string=>!!x))];
  for(const outcome of ['strong','workable','strained'])if(!outcomeSet.includes(outcome))distinctIssues.set(`outcomes.${outcome}`,{path:'outcomes',message:`No explored path reaches the ${outcome} outcome.`,severity:'warning'});
  const values=paths.map(p=>p.score);
  const withinDomains=paths.length>0&&paths.every(path=>path.run.history.every(snapshot=>s.measures.every(measure=>snapshot.state[measure.key]>=measure.domain[0]&&snapshot.state[measure.key]<=measure.domain[1])));
  const nonNegativeResourcesAndTime=paths.length>0&&paths.every(path=>s.measures.filter(measure=>measure.role==='resources'||measure.role==='time').every(measure=>path.state[measure.key]>=0));
  for(let i=0;i<s.thresholds.length;i++)for(let j=i+1;j<s.thresholds.length;j++){
    const a=s.thresholds[i],b=s.thresholds[j];if(a.measure===b.measure&&a.below===b.below&&a.atMost===b.atMost)distinctIssues.set(`thresholds.${j}`,{path:`thresholds.${j}`,message:'This threshold duplicates an earlier rule and may be redundant.',severity:'warning'});
  }
  return{valid:paths.length>0&&![...distinctIssues.values()].some(i=>i.severity==='error'),issues:[...distinctIssues.values()],pathCount:paths.length,paths,best:values.length?Math.max(...values):null,median:medianScore(values),worst:values.length?Math.min(...values):null,outcomes:outcomeSet,withinDomains,nonNegativeResourcesAndTime,decisions:Array.from({length:s.steps},(_,i)=>({step:i+1,reachable:decisionReach.has(i+1)})),options:s.options.map(o=>({id:o.id,reachable:optionReach.has(o.id)})),events:s.events.map(e=>({id:e.id,reachable:eventReach.has(e.id)})),triggers:s.triggers.map(t=>({id:t.id,reachable:triggerReach.has(t.id)})),thresholds:s.thresholds.map(t=>({id:t.id,reachable:thresholdReach.has(t.id)}))};
}

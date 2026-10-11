import { scenarios } from '../scenarios/index.ts';
import { newRun, applyDecision } from '../engine/engine.ts';
import { missionFor } from '../game/missions.ts';
import type { Scenario } from '../scenarios/schema.ts';
import type { StudioSituation, StudioTheme } from './types.ts';

const copy = <T,>(value:T):T => structuredClone(value);
let idSequence=0;
export function studioId(prefix='situation') {
  idSequence+=1;
  const random=typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`${Date.now().toString(36)}-${idSequence.toString(36)}`;
  return `studio-${prefix}-${random}`;
}
const themeById:Record<string,StudioTheme>={
  'college-tech-fest':'stage','startup-product-launch':'office','restaurant-opening-week':'kitchen',
  'flood-relief-camp':'hall','film-shoot-weather':'set','harvest-before-rains':'field'
};
function metadataFor(scenario:Scenario,baseScenarioId?:string){
  const mission=missionFor(scenario.id);
  return {theme:themeById[baseScenarioId||scenario.id]||'generic',mission:copy(mission?.mission||[]),mastery:copy(mission?.mastery||[]),samplePath:[scenario.options[0]?.id,scenario.options[1]?.id,scenario.options[2]?.id] as [string,string,string],...(baseScenarioId?{baseScenarioId}:{})};
}

function customTemplate(id=studioId()):Scenario {
  const events=[{id:'studio-opening',title:'The situation is set',description:'The team has a limited window to prepare.',why:'This opening state is defined by the scenario author.'}];
  const options=[
    {id:'choice-one',title:'Protect the plan',detail:'Preserve the core plan and its resources.',effects:[{measure:'resources',delta:-8,reason:'Materials are reserved for the original plan.'},{measure:'progress',delta:12,reason:'The prepared scope advances.'}]},
    {id:'choice-two',title:'Reduce the scope',detail:'Keep more resources available by narrowing the work.',effects:[{measure:'resources',delta:8,reason:'A smaller scope uses fewer supplies.'},{measure:'progress',delta:-3,reason:'The reduced scope delays some preparation.'}]},
    {id:'choice-three',title:'Ask for support',detail:'Bring in help while balancing team capacity.',effects:[{measure:'people',delta:6,reason:'Shared work improves team capacity.'},{measure:'progress',delta:5,reason:'Additional support moves preparation forward.'}]}
  ];
  const measures=[
    {key:'resources',role:'resources' as const,label:'Resources',format:'points' as const,domain:[0,100] as [number,number],higherIsBetter:true},
    {key:'time',role:'time' as const,label:'Days remaining',format:'days' as const,domain:[0,7] as [number,number],higherIsBetter:true},
    {key:'people',role:'people' as const,label:'Team energy',format:'points' as const,domain:[0,100] as [number,number],higherIsBetter:true},
    {key:'progress',role:'progress' as const,label:'Preparation',format:'percent' as const,domain:[0,100] as [number,number],higherIsBetter:true}
  ];
  for(let step=1;step<=3;step++) for(const option of options){
    const eventId=`stage-${step}-${option.id}`;
    events.push({id:eventId,title:`Decision ${step}: ${option.title}`,description:option.detail,why:option.effects.map(e=>e.reason).join(' ')});
  }
  events.push({id:'calendar',title:'The deadline arrives',description:'The available time has been used.',why:'The scenario evaluates the recorded state at its deadline.'},{id:'ending',title:'The situation concludes',description:'The final state determines the outcome.',why:'The simulation evaluates the weighted measures.'});
  const triggers=Array.from({length:3},(_,i)=>options.map(option=>({id:`studio-trigger-${i+1}-${option.id}`,step:i+1,optionId:option.id,eventId:`stage-${i+1}-${option.id}`,why:option.effects.map(e=>e.reason).join(' ')}))).flat();
  return {id,title:'Untitled situation',difficulty:'Easy',contextLine:'A short situation with limited resources and time.',tone:'Operational',intro:{summary:'Describe the situation your team must resolve.',objective:'Balance resources, time, people and progress.'},openingEventId:'studio-opening',measures,startingState:{resources:60,time:7,people:65,progress:35},steps:3,events,options,triggers,drift:[{measure:'time',delta:-1,reason:'One day passes after each decision.'},{measure:'people',delta:-1,reason:'Routine work uses team energy.'},{measure:'progress',delta:5,reason:'Routine work advances preparation.'}],thresholds:[],outcomes:[{id:'strong',label:'Strong',minScore:57},{id:'workable',label:'Workable',minScore:54},{id:'strained',label:'Strained',minScore:0}],scoreWeights:{resources:.25,time:.15,people:.25,progress:.35},footer:'Illustrative model. Values are assumptions, not forecasts.'};
}

export function createCustomSituation(now=new Date()):StudioSituation {
  const scenario=customTemplate();
  return {id:scenario.id,kind:'custom',title:scenario.title,createdAt:now.toISOString(),updatedAt:now.toISOString(),scenario,metadata:{theme:'generic',mission:[{measure:'progress',min:60,description:'Preparation reaches 60%'},{measure:'people',min:50,description:'Team energy stays at 50 or higher'}],mastery:[{measure:'resources',min:50,description:'Keep at least 50 resources'},{measure:'progress',min:70,description:'Preparation reaches 70%'}],samplePath:['choice-one','choice-two','choice-three']},draft:true,runHistory:[]};
}

export function createVariant(base:Scenario,now=new Date()):StudioSituation {
  const id=studioId('variant');
  const scenario=copy(base);scenario.id=id;
  const mission=metadataFor(base,base.id);
  return {id,kind:'edited',title:`${base.title} — Edited`,createdAt:now.toISOString(),updatedAt:now.toISOString(),scenario,metadata:mission,draft:true,runHistory:[]};
}

export function immutableBuiltInSnapshot(scenario:Scenario) { return copy(scenario); }
export function themeForScenario(scenario:Scenario):StudioTheme{return themeById[scenario.id]||'generic'}
export function defaultRuntimeMission(item:StudioSituation) {
  const rankDefaults={Bronze:0,Silver:50,Gold:65,Platinum:80} as const;
  const weights={resources:0,time:0,people:0,progress:0,stars:0,unusedTools:0};
  for(const measure of item.scenario.measures)weights[measure.role]+=Math.max(0,item.scenario.scoreWeights[measure.key]||0);
  const total=Object.values(weights).reduce((a,b)=>a+b,0)||1;
  for(const key of Object.keys(weights) as (keyof typeof weights)[])weights[key]/=total;
  return {scenarioId:item.scenario.id,title:item.title,description:'Studio missions remain local and do not award campaign progress.',mission:item.metadata.mission,mastery:item.metadata.mastery,weights,ranks:{...rankDefaults}};
}

export function runSamplePath(item:StudioSituation,choices=item.metadata.samplePath) {
  let run=newRun(item.scenario,'A');
  for(const optionId of choices){
    if(run.status!=='active')break;
    run=applyDecision(item.scenario,run,optionId);
  }
  return run;
}

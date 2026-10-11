import { validateScenarioShape, validateSituation, MAX_IMPORT_BYTES, MAX_SCENARIO_BYTES } from './schema.ts';
import type { Scenario } from '../scenarios/schema.ts';
import { studioId } from './defaults.ts';
import type { StudioSituation } from './types.ts';

const obj=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const text=(x:any,max:number,path:string)=>{if(typeof x!=='string'||x.length>max||/[<>]/.test(x))throw new Error(`${path}: expected plain text up to ${max} characters.`);return x;};
const finite=(x:any,path:string)=>{if(!Number.isFinite(x)||Math.abs(x)>1_000_000)throw new Error(`${path}: number is outside the supported range.`);return x as number;};
function rejectExecutableKeys(value:unknown,path='payload'){
  if(Array.isArray(value)){value.forEach((item,index)=>rejectExecutableKeys(item,`${path}.${index}`));return;}
  if(!obj(value))return;
  for(const [key,child] of Object.entries(value)){
    if(['__proto__','prototype','constructor'].includes(key))throw new Error(`${path}.${key}: executable or prototype-related keys are not accepted.`);
    rejectExecutableKeys(child,`${path}.${key}`);
  }
}

/** Copies only fields the engine knows. Imported objects never flow directly into the engine. */
export function sanitizeScenario(input:unknown,id=studioId('import')):Scenario {
  if(!obj(input))throw new Error('scenario: expected a JSON object.');
  rejectExecutableKeys(input,'scenario');
  const s=input as any;
  const measures=Array.isArray(s.measures)?s.measures.map((m:any,i:number)=>({key:text(m?.key,40,`measures.${i}.key`),role:m?.role,label:text(m?.label,40,`measures.${i}.label`),format:m?.format,domain:[finite(m?.domain?.[0],`measures.${i}.domain[0]`),finite(m?.domain?.[1],`measures.${i}.domain[1]`)] as [number,number],higherIsBetter:m?.higherIsBetter===true})):s.measures;
  const effect=(e:any,path:string)=>({measure:text(e?.measure,40,`${path}.measure`),delta:finite(e?.delta,`${path}.delta`),reason:text(e?.reason,120,`${path}.reason`)});
  const clean:Scenario={
    id,title:text(s.title,60,'title'),difficulty:s.difficulty,contextLine:text(s.contextLine,200,'contextLine'),tone:text(s.tone||'Operational',60,'tone'),
    intro:{summary:text(s.intro?.summary,200,'intro.summary'),objective:text(s.intro?.objective,200,'intro.objective')},openingEventId:text(s.openingEventId,80,'openingEventId'),
    ...(Array.isArray(s.openingEffects)?{openingEffects:s.openingEffects.map((e:any,i:number)=>effect(e,`openingEffects.${i}`))}:{}),
    measures,startingState:Object.fromEntries(measures.map((m:any)=>[m.key,finite(s.startingState?.[m.key],`startingState.${m.key}`)])),steps:s.steps,
    events:Array.isArray(s.events)?s.events.map((e:any,i:number)=>({id:text(e?.id,80,`events.${i}.id`),title:text(e?.title,120,`events.${i}.title`),description:text(e?.description,200,`events.${i}.description`),why:text(e?.why,500,`events.${i}.why`)})):s.events,
    options:Array.isArray(s.options)?s.options.map((o:any,i:number)=>({id:text(o?.id,80,`options.${i}.id`),title:text(o?.title,60,`options.${i}.title`),detail:text(o?.detail,200,`options.${i}.detail`),effects:Array.isArray(o?.effects)?o.effects.map((e:any,j:number)=>effect(e,`options.${i}.effects.${j}`)):o.effects,...(o?.timeCost===undefined||o.timeCost===0?{}:(()=>{throw new Error(`options.${i}.timeCost: this engine does not apply timeCost; use a measure effect.`)})())})):s.options,
    triggers:Array.isArray(s.triggers)?s.triggers.map((t:any,i:number)=>({id:text(t?.id,80,`triggers.${i}.id`),step:t?.step,optionId:text(t?.optionId,80,`triggers.${i}.optionId`),eventId:text(t?.eventId,80,`triggers.${i}.eventId`),why:text(t?.why,500,`triggers.${i}.why`),...(Array.isArray(t?.effects)?{effects:t.effects.map((e:any,j:number)=>effect(e,`triggers.${i}.effects.${j}`))}:{})})):s.triggers,
    drift:Array.isArray(s.drift)?s.drift.map((e:any,i:number)=>effect(e,`drift.${i}`)):s.drift,
    thresholds:Array.isArray(s.thresholds)?s.thresholds.map((r:any,i:number)=>({id:text(r?.id,80,`thresholds.${i}.id`),measure:text(r?.measure,40,`thresholds.${i}.measure`),...(r?.eventId?{eventId:text(r.eventId,80,`thresholds.${i}.eventId`)}:{}),...(r?.atMost===undefined?{}:{atMost:finite(r.atMost,`thresholds.${i}.atMost`)}),...(r?.below===undefined?{}:{below:finite(r.below,`thresholds.${i}.below`)}),effects:Array.isArray(r?.effects)?r.effects.map((e:any,j:number)=>effect(e,`thresholds.${i}.effects.${j}`)):r.effects,why:text(r?.why,120,`thresholds.${i}.why`)})):s.thresholds,
    outcomes:Array.isArray(s.outcomes)?s.outcomes.map((x:any,i:number)=>({id:x?.id,label:text(x?.label,60,`outcomes.${i}.label`),minScore:finite(x?.minScore,`outcomes.${i}.minScore`)})):s.outcomes,
    scoreWeights:obj(s.scoreWeights)?Object.fromEntries(Object.entries(s.scoreWeights).map(([key,value])=>[text(key,40,'scoreWeights.key'),finite(value,`scoreWeights.${key}`)])):s.scoreWeights,
    footer:text(s.footer||'Illustrative model. Values are assumptions, not forecasts.',200,'footer')
  };
  const result=validateScenarioShape(clean);if(!result.valid)throw new Error(result.issues.map(x=>`${x.path}: ${x.message}`).join('\n'));
  return clean;
}
export function exportSituation(item:StudioSituation):string {
  const payload={schemaVersion:1,scenarioType:'echoes-scenario',scenario:{...item.scenario,id:item.id},metadata:{theme:item.metadata.theme,mission:item.metadata.mission,mastery:item.metadata.mastery,samplePath:item.metadata.samplePath}};
  const textValue=JSON.stringify(payload,null,2);if(new TextEncoder().encode(textValue).byteLength>MAX_SCENARIO_BYTES)throw new Error('Export exceeds the 20 KB scenario limit.');return textValue;
}
export function importSituation(textValue:string,now=new Date()):StudioSituation {
  if(new TextEncoder().encode(textValue).byteLength>MAX_IMPORT_BYTES)throw new Error('Import is over the 64 KB parsing limit.');
  let payload:unknown;try{payload=JSON.parse(textValue)}catch{throw new Error('Import is not valid JSON.');}
  if(!obj(payload)||payload.schemaVersion!==1||payload.scenarioType!=='echoes-scenario')throw new Error('Unsupported export schema. Expected echoes-scenario version 1.');
  rejectExecutableKeys(payload);
  const id=studioId('import');const scenario=sanitizeScenario(payload.scenario,id);const meta=obj(payload.metadata)?payload.metadata:{};
  const criterion=(value:any,path:string)=>{if(!obj(value))throw new Error(`${path}: expected a requirement object.`);const result:{measure:string;min?:number;max?:number;description:string}={measure:text(value.measure,40,`${path}.measure`),description:text(value.description,120,`${path}.description`)};if(value.min!==undefined)result.min=finite(value.min,`${path}.min`);if(value.max!==undefined)result.max=finite(value.max,`${path}.max`);return result;};
  if(meta.theme!==undefined&&!['stage','office','kitchen','hall','set','field','workshop','generic'].includes(meta.theme))throw new Error('metadata.theme: unsupported Studio theme.');
  const samplePath=meta.samplePath===undefined?scenario.options.map(x=>x.id):meta.samplePath;
  if(!Array.isArray(samplePath)||samplePath.length!==3)throw new Error('metadata.samplePath: provide exactly three option IDs.');
  const metadata={theme:meta.theme||'generic',mission:Array.isArray(meta.mission)?meta.mission.map((x:any,i:number)=>criterion(x,`metadata.mission.${i}`)):[],mastery:Array.isArray(meta.mastery)?meta.mastery.map((x:any,i:number)=>criterion(x,`metadata.mastery.${i}`)):[],samplePath:samplePath.map((x:any,i:number)=>text(x,80,`metadata.samplePath.${i}`))} as StudioSituation['metadata'];
  const situation:StudioSituation={id,kind:'imported',title:scenario.title,createdAt:now.toISOString(),updatedAt:now.toISOString(),scenario,metadata,draft:true,runHistory:[]};
  const situationValidation=validateSituation(situation);if(!situationValidation.valid)throw new Error(situationValidation.issues.map(x=>`${x.path}: ${x.message}`).join('\n'));
  if(new TextEncoder().encode(JSON.stringify(situation)).byteLength>MAX_SCENARIO_BYTES)throw new Error('Imported situation exceeds the 20 KB saved item limit.');
  return situation;
}

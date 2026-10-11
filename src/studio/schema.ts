import type { Scenario } from '../scenarios/schema';
import type { ScenarioValidation, StudioSituation, StudioTheme, ValidationIssue } from './types';

export const MAX_SITUATIONS = 20;
export const MAX_SCENARIO_BYTES = 20 * 1024;
export const MAX_IMPORT_BYTES = 64 * 1024;
const MAX_NUMBER = 1_000_000;
const textOnly = (value: unknown, max: number) => typeof value === 'string' && value.length <= max && !/[<>]/.test(value);
const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const themes: StudioTheme[] = ['stage','office','kitchen','hall','set','field','workshop','generic'];

export function validateScenarioShape(value: unknown): ScenarioValidation {
  const issues: ValidationIssue[] = [];
  const err = (path: string, message: string) => issues.push({path,message,severity:'error'});
  if (!isObject(value)) return {valid:false,issues:[{path:'scenario',message:'Expected a plain scenario object.',severity:'error'}]};
  const s = value as unknown as Scenario;
  if (!textOnly(s.id,80) || !/^[a-z0-9][a-z0-9-]*$/.test(s.id)) err('id','Use a stable lowercase ID with letters, numbers and hyphens.');
  if (!textOnly(s.title,60) || !s.title.trim()) err('title','Title is required and must be 60 characters or fewer.');
  if (!textOnly(s.contextLine,200)) err('contextLine','Context must be 200 characters or fewer.');
  if (!['Easy','Medium','Hard'].includes(s.difficulty)) err('difficulty','Choose Easy, Medium or Hard.');
  if (!isObject(s.intro) || !textOnly(s.intro.summary,200) || !textOnly(s.intro.objective,200)) err('intro','Summary and objective must be plain text under 200 characters.');
  if (!Number.isInteger(s.steps) || s.steps !== 3) err('steps','The existing ECHOES engine requires exactly three decision stages.');
  if (!Array.isArray(s.measures) || s.measures.length !== 4) err('measures','Exactly four measures are required.');
  else {
    const roles = ['resources','time','people','progress'];
    if (roles.some(role => s.measures.filter(m => m?.role === role).length !== 1)) err('measures','Use exactly one measure for each fixed role: Resources, Time, People and Progress.');
    s.measures.forEach((m:any,i:number)=>{
      if (!isObject(m)) { err(`measures.${i}`,'Measure must be an object.'); return; }
      if (!textOnly(m.key,40) || !/^[a-z][a-zA-Z0-9_]*$/.test(m.key)) err(`measures.${i}.key`,'Measure key is invalid.');
      if (!textOnly(m.label,40) || !m.label.trim()) err(`measures.${i}.label`,'Measure label is required and limited to 40 characters.');
      if (!['rupees','lakhs','days','hours','points','percent','count'].includes(m.format)) err(`measures.${i}.format`,'Unsupported measure format.');
      if (!Array.isArray(m.domain) || m.domain.length !== 2 || !m.domain.every(Number.isFinite) || m.domain[0] >= m.domain[1] || Math.abs(m.domain[0]) > MAX_NUMBER || Math.abs(m.domain[1]) > MAX_NUMBER) err(`measures.${i}.domain`,'Domain must be finite, ordered and within ±1,000,000.');
      if (typeof m.higherIsBetter !== 'boolean') err(`measures.${i}.higherIsBetter`,'Choose whether higher values are better.');
    });
    if(new Set(s.measures.filter((m:any)=>isObject(m)).map((m:any)=>m.key)).size!==s.measures.length)err('measures','Measure keys must be unique.');
  }
  if (!isObject(s.startingState) || !Array.isArray(s.measures) || s.measures.some(m => !Number.isFinite(s.startingState?.[m?.key]) || s.startingState[m?.key] < m?.domain?.[0] || s.startingState[m?.key] > m?.domain?.[1])) err('startingState','Every starting measure must be finite and inside its declared domain.');
  if (!Array.isArray(s.options) || s.options.length !== 3) err('options','The engine requires exactly three reusable options.');
  else s.options.forEach((o:any,i:number)=>{
    if (!isObject(o)) { err(`options.${i}`,'Each option must be an object.'); return; }
    if(o.timeCost!==undefined&&(!Number.isFinite(o.timeCost)||o.timeCost!==0))err(`options.${i}.timeCost`,'This engine does not apply option timeCost; represent time changes as a normal measure effect instead.')
    if (!textOnly(o.id,60) || !/^[a-z0-9][a-z0-9-]*$/.test(o.id) || !textOnly(o.title,60) || !o.title.trim() || !textOnly(o.detail,200)) err(`options.${i}`,'Each option needs a stable ID, title and plain description.');
    if (!Array.isArray(o.effects) || o.effects.length > 4) err(`options.${i}.effects`,'Each option may contain zero to four effects.');
    else o.effects.forEach((e:any,j:number)=>{
      if (!isObject(e)) { err(`options.${i}.effects.${j}`,'Effect must be an object.'); return; }
      if (!s.measures?.some(m=>m?.key===e.measure)) err(`options.${i}.effects.${j}.measure`,'Effect must reference an existing measure.');
      if (!Number.isFinite(e.delta) || Math.abs(e.delta)>MAX_NUMBER) err(`options.${i}.effects.${j}.delta`,'Effect delta must be finite and within ±1,000,000.');
      if (!textOnly(e.reason,120) || !e.reason.trim()) err(`options.${i}.effects.${j}.reason`,'Effect explanation is required and limited to 120 characters.');
    });
  });
  if (!Array.isArray(s.events) || !s.events.some(e=>isObject(e)&&e.id===s.openingEventId)) err('openingEventId','Opening event must exist.');
  if(Array.isArray(s.events)) {
    s.events.forEach((e:any,i:number)=>{if(!isObject(e)||!textOnly(e.id,80)||!textOnly(e.title,120)||!textOnly(e.description,200)||!textOnly(e.why,500))err(`events.${i}`,'Event needs a stable ID, title, description and explanation as plain text.');});
    if(new Set(s.events.filter((e:any)=>isObject(e)).map((e:any)=>e.id)).size!==s.events.length)err('events','Event IDs must be unique.');
  }
  if(Array.isArray(s.options)&&new Set(s.options.filter((o:any)=>isObject(o)).map((o:any)=>o.id)).size!==s.options.length)err('options','Option IDs must be unique.');
  if(Array.isArray(s.openingEffects))s.openingEffects.forEach((e:any,i:number)=>{if(!isObject(e)||!s.measures?.some(m=>m?.key===e.measure)||!Number.isFinite(e.delta)||Math.abs(e.delta)>MAX_NUMBER||!textOnly(e.reason,120)||!e.reason.trim())err(`openingEffects.${i}`,'Opening effect requires a real measure, bounded delta and explanation.');});
  for (const key of ['drift','thresholds','triggers'] as const) if (!Array.isArray(s[key])) err(key,'Expected a list.');
  if (Array.isArray(s.drift)) s.drift.forEach((e:any,i:number)=>{if(!isObject(e)||!s.measures?.some(m=>m?.key===e.measure)||!Number.isFinite(e.delta)||Math.abs(e.delta)>MAX_NUMBER||!textOnly(e.reason,120)||!e.reason.trim())err(`drift.${i}`,'Drift needs a valid measure, bounded delta and explanation.');});
  if (Array.isArray(s.thresholds)) {
    if(s.thresholds.length>3)err('thresholds','At most three threshold rules are supported.');
    if(new Set(s.thresholds.filter((r:any)=>isObject(r)).map((r:any)=>r.id)).size!==s.thresholds.length)err('thresholds','Threshold IDs must be unique.');
    s.thresholds.forEach((r:any,i:number)=>{
      if(!isObject(r)){err(`thresholds.${i}`,'Threshold must be an object.');return;}
      if(!s.measures?.some(m=>m?.key===r.measure))err(`thresholds.${i}.measure`,'Threshold must reference an existing measure.');
      if(r.eventId!==undefined&&!s.events?.some(e=>e?.id===r.eventId))err(`thresholds.${i}.eventId`,'Threshold event must reference an existing event.')
      if(!textOnly(r.id,80)||!/^([a-z0-9][a-z0-9-]*)$/.test(r.id))err(`thresholds.${i}.id`,'Threshold needs a stable lowercase ID.');
      if((r.below===undefined)===(r.atMost===undefined)||!Number.isFinite(r.below??r.atMost)||Math.abs(r.below??r.atMost)>MAX_NUMBER)err(`thresholds.${i}.value`,'Use exactly one finite below or at-most threshold within the supported range.');
      if(!Array.isArray(r.effects)||r.effects.length<1||r.effects.length>4||!textOnly(r.why,120)||!r.why.trim())err(`thresholds.${i}`,'Threshold requires one to four effects and a plain explanation.');
      else r.effects.forEach((e:any,j:number)=>{if(!isObject(e)||!s.measures?.some(m=>m?.key===e.measure)||!Number.isFinite(e.delta)||Math.abs(e.delta)>MAX_NUMBER||!textOnly(e.reason,120)||!e.reason.trim())err(`thresholds.${i}.effects.${j}`,'Threshold effect needs a valid measure, bounded delta and plain explanation.');});
    });
  }
  if(Array.isArray(s.triggers)) s.triggers.forEach((t:any,i:number)=>{
    if(!isObject(t)||!textOnly(t.id,80)||!Number.isInteger(t.step)||t.step<1||t.step>3||!s.options?.some(o=>o?.id===t.optionId)||!s.events?.some(e=>e?.id===t.eventId)||!textOnly(t.why,500))err(`triggers.${i}`,'Trigger must use a supported step, existing option/event, and plain explanation.');
    else if(t.effects!==undefined&&(!Array.isArray(t.effects)||t.effects.length>0))err(`triggers.${i}.effects`,'The existing engine records a trigger event but does not apply trigger-specific effects; use an option or threshold effect instead.');
  });
  if(Array.isArray(s.triggers)&&new Set(s.triggers.filter((t:any)=>isObject(t)).map((t:any)=>t.id)).size!==s.triggers.length)err('triggers','Trigger IDs must be unique.');
  if(!Array.isArray(s.outcomes)||s.outcomes.length!==3||!['strong','workable','strained'].every(id=>s.outcomes.some(o=>isObject(o)&&o.id===id&&Number.isFinite(o.minScore)&&o.minScore>=0&&o.minScore<=100&&textOnly(o.label,60)&&o.label.trim())))err('outcomes','Define plain-text Strong, Workable and Strained labels with thresholds between 0 and 100.')
  else if(s.outcomes.map((o:any)=>o?.id).join(',')!=='strong,workable,strained')err('outcomes','Keep outcomes in engine order: Strong, Workable, Strained.');
  if(Array.isArray(s.outcomes)&&s.outcomes.length===3){const strong=s.outcomes.find((o:any)=>o?.id==='strong')?.minScore,workable=s.outcomes.find((o:any)=>o?.id==='workable')?.minScore,strained=s.outcomes.find((o:any)=>o?.id==='strained')?.minScore;if(strong!==undefined&&workable!==undefined&&strained!==undefined&&Number.isFinite(strong)&&Number.isFinite(workable)&&Number.isFinite(strained)&&(strong<workable||workable<strained))err('outcomes','Order thresholds so Strong ≥ Workable ≥ Strained.');}
  if(!isObject(s.scoreWeights)||!s.measures?.every(m=>m&&Number.isFinite(s.scoreWeights?.[m?.key])&&s.scoreWeights[m.key]>=0&&s.scoreWeights[m.key]<=MAX_NUMBER)||Object.keys(s.scoreWeights||{}).some(key=>!s.measures?.some(m=>m?.key===key))||!Object.values(s.scoreWeights||{}).some(weight=>typeof weight==='number'&&Number.isFinite(weight)&&weight>0))err('scoreWeights','Each measure needs a non-negative bounded finite score weight, with no unknown measure keys.');
  if(!textOnly(s.footer,200))err('footer','Footer must be plain text under 200 characters.');
  return {valid:issues.every(i=>i.severity!=='error'),issues};
}

export function validateSituation(value: unknown): ScenarioValidation {
  if (!isObject(value)) return {valid:false,issues:[{path:'situation',message:'Expected a plain situation object.',severity:'error'}]};
  const result=validateScenarioShape(value.scenario);
  const issues=[...result.issues];
  if(!textOnly(value.id,80)||!/^studio-[a-z0-9-]+$/.test(value.id)||value.scenario?.id!==value.id)issues.push({path:'id',message:'Situation ID must be a stable Studio ID shared with its scenario.',severity:'error'});
  if(!textOnly(value.title,60)||!value.title.trim())issues.push({path:'title',message:'Situation title is required and limited to 60 characters.',severity:'error'});
  if(!['custom','edited','imported'].includes(value.kind)||typeof value.draft!=='boolean')issues.push({path:'kind',message:'Situation type or draft status is invalid.',severity:'error'});
  const meta=value.metadata;
  if(!isObject(meta)||!themes.includes(meta.theme))issues.push({path:'metadata.theme',message:'Choose one supported diorama theme.',severity:'error'});
  if(isObject(meta)) for(const key of ['mission','mastery'] as const){
    if(!Array.isArray(meta[key]))issues.push({path:`metadata.${key}`,message:'Expected a list of measurable requirements.',severity:'error'});
    else {
      if(new Set(meta[key].filter((c:any)=>isObject(c)).map((c:any)=>c.measure)).size!==meta[key].length)issues.push({path:`metadata.${key}`,message:'Each measure may appear only once in a goal list.',severity:'error'});
      meta[key].forEach((c:any,i:number)=>{const measure=value.scenario?.measures?.find((m:any)=>m?.key===c?.measure);const validMin=c?.min===undefined||Number.isFinite(c.min)&&c.min>=measure?.domain?.[0]&&c.min<=measure?.domain?.[1];const validMax=c?.max===undefined||Number.isFinite(c.max)&&c.max>=measure?.domain?.[0]&&c.max<=measure?.domain?.[1];if(!isObject(c)||!measure||!textOnly(c.description,120)||(!Number.isFinite(c.min)&&!Number.isFinite(c.max))||!validMin||!validMax||(c.min!==undefined&&c.max!==undefined&&c.min>c.max))issues.push({path:`metadata.${key}.${i}`,message:'Requirement must reference a real measure and define ordered thresholds inside its domain.',severity:'error'});});
    }
  }
  if(isObject(meta)&&(!Array.isArray(meta.samplePath)||meta.samplePath.length!==3||meta.samplePath.some((id:any)=>!value.scenario?.options?.some((o:any)=>o?.id===id))))issues.push({path:'metadata.samplePath',message:'Sample path must contain exactly three existing option IDs.',severity:'error'});
  try { if(new TextEncoder().encode(JSON.stringify(value)).byteLength>MAX_SCENARIO_BYTES)issues.push({path:'situation',message:'A saved situation must be under 20 KB.',severity:'error'}); } catch {issues.push({path:'situation',message:'Situation could not be serialized safely.',severity:'error'});}
  return {valid:issues.every(i=>i.severity!=='error'),issues};
}

export function sanitizePlainText(value:string,max:number) {
  if(value.length>max||/[<>]/.test(value))throw new Error(`Text must contain no markup and stay within ${max} characters.`);
  return value.trim();
}

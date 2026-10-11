import { MAX_SCENARIO_BYTES, MAX_SITUATIONS } from './schema.ts';
import type { StudioSituation, StudioState } from './types.ts';
import { validateSituation } from './schema.ts';

export const STUDIO_STORAGE_KEY='echoes.studio.v1';
export const emptyStudioState=():StudioState=>({version:1,situations:[],draft:null});
let memoryState=emptyStudioState();
export interface StudioLoadResult { state:StudioState; warning:string|null; persistent:boolean }
const bounded=(value:unknown)=>{try{return new TextEncoder().encode(JSON.stringify(value)).byteLength<=MAX_SCENARIO_BYTES}catch{return false}};
function validRecord(value:any):value is StudioSituation {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
  const s=value.scenario;
  const safeEffect=(item:any)=>item&&typeof item.measure==='string'&&Number.isFinite(item.delta)&&Math.abs(item.delta)<=1_000_000&&typeof item.reason==='string'&&item.reason.length<=120;
  const safeScenario=!!s&&typeof s==='object'&&typeof s.id==='string'&&s.id===value.id&&Array.isArray(s.measures)&&s.measures.length===4&&s.measures.every((m:any)=>m&&typeof m.key==='string'&&typeof m.label==='string'&&Array.isArray(m.domain)&&m.domain.length===2&&m.domain.every(Number.isFinite)&&typeof m.role==='string')&&s.startingState&&typeof s.startingState==='object'&&s.measures.every((m:any)=>Number.isFinite(s.startingState[m.key]))&&Array.isArray(s.options)&&s.options.length===3&&s.options.every((o:any)=>o&&typeof o.id==='string'&&typeof o.title==='string'&&typeof o.detail==='string'&&Array.isArray(o.effects)&&o.effects.length<=4&&o.effects.every(safeEffect))&&Array.isArray(s.events)&&s.events.length>0&&s.events.every((e:any)=>e&&typeof e.id==='string'&&typeof e.title==='string'&&typeof e.description==='string'&&typeof e.why==='string')&&Array.isArray(s.drift)&&s.drift.every(safeEffect)&&Array.isArray(s.thresholds)&&s.thresholds.length<=3&&s.thresholds.every((t:any)=>t&&typeof t.id==='string'&&typeof t.measure==='string'&&Array.isArray(t.effects)&&t.effects.every(safeEffect))&&Array.isArray(s.triggers)&&Array.isArray(s.outcomes)&&s.outcomes.length===3&&s.scoreWeights&&typeof s.scoreWeights==='object';
  return typeof value.id==='string'&&value.id.startsWith('studio-')&&['custom','edited','imported'].includes(value.kind)&&typeof value.title==='string'&&value.title.length<=60&&typeof value.draft==='boolean'&&safeScenario&&value.metadata&&typeof value.metadata==='object'&&Array.isArray(value.metadata.mission)&&Array.isArray(value.metadata.mastery)&&Array.isArray(value.metadata.samplePath)&&value.metadata.samplePath.length===3&&bounded(value)&&Array.isArray(value.runHistory)&&value.runHistory.length<=20;
}
export function loadStudioStorage(storage:Storage|undefined=typeof localStorage==='undefined'?undefined:localStorage):StudioLoadResult {
  if(!storage)return{state:memoryState,warning:'Browser storage is unavailable. Studio data will remain in memory for this session.',persistent:false};
  try{
    const text=storage.getItem(STUDIO_STORAGE_KEY);if(!text)return{state:memoryState,warning:null,persistent:true};
    if(new TextEncoder().encode(text).byteLength>2_000_000)throw new Error('Studio storage exceeds the safe size limit.');
    const parsed=JSON.parse(text);if(parsed?.version===1&&Array.isArray(parsed.situations)){
      const situations=(parsed.situations as unknown[]).filter(validRecord).slice(0,MAX_SITUATIONS);
      const rawDraft=parsed.draft&&validRecord(parsed.draft.situation)?parsed.draft:null;
      memoryState={version:1,situations,draft:rawDraft?{situation:rawDraft.situation,step:Number.isInteger(rawDraft.step)?Math.max(0,Math.min(4,rawDraft.step)):0}:null};
      return{state:memoryState,warning:situations.length!==parsed.situations.length?'Some malformed or oversized Studio items were ignored.':null,persistent:true};
    }
    // Version-zero migration used a flat situations array; keep only bounded, recognisable records.
    if(parsed?.version===0&&Array.isArray(parsed.items)){
      const situations=parsed.items.filter(validRecord).slice(0,MAX_SITUATIONS);memoryState={version:1,situations,draft:null};saveStudioStorage(memoryState,storage);
      return{state:memoryState,warning:'Studio data was upgraded to the current format.',persistent:true};
    }
    return{state:memoryState,warning:'Studio data had an unsupported version and was left untouched.',persistent:true};
  }catch{return{state:memoryState,warning:'Studio data could not be read. The saved source was left untouched; in-memory editing is available.',persistent:false};}
}
export function saveStudioStorage(state:StudioState,storage:Storage|undefined=typeof localStorage==='undefined'?undefined:localStorage):boolean {
  memoryState=state;
  if(!storage)return false;
  try{
    if(state.situations.length>MAX_SITUATIONS||state.situations.some(item=>!validRecord(item)||!bounded(item)))return false;
    const json=JSON.stringify(state);if(new TextEncoder().encode(json).byteLength>2_000_000)return false;
    storage.setItem(STUDIO_STORAGE_KEY,json);return true;
  }catch{return false;}
}
export function setMemoryStudioState(state:StudioState){memoryState=state;}
export function studioRecordFits(item:StudioSituation){return validRecord(item)&&bounded(item)&&validateSituation(item).issues.filter(issue=>issue.severity==='error').length===0;}

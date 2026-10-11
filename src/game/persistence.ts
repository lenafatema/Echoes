import type { GameProgress } from './types';
export const GAME_SAVE_KEY='echoes.game.v1';
export const emptyProgress=():GameProgress=>({version:1,bestStars:{},personalBests:{},achievements:[],runs:[],sessions:{},tutorialComplete:false,soundEnabled:false});
interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem?(key:string):void }
let memoryFallback:string|null=null;
function browserStorage():StorageLike|null { try { return typeof localStorage==='undefined'?null:localStorage; } catch { return null; } }
function isObject(value:unknown):value is Record<string,any> { return !!value&&typeof value==='object'&&!Array.isArray(value); }
const finiteRecord=(value:unknown):value is Record<string,number>=>isObject(value)&&Object.values(value).every(item=>typeof item==='number'&&Number.isFinite(item));
function validToolLog(value:unknown) {
  return Array.isArray(value)&&value.length<=500&&value.every(entry=>isObject(entry)&&['foresight','rewind','advisor'].includes(entry.tool)&&typeof entry.at==='string'&&typeof entry.detail==='string');
}
function validDaily(value:unknown) {
  return value===null||(isObject(value)&&/^\d{4}-\d{2}-\d{2}$/.test(value.date)&&typeof value.scenarioId==='string'&&isObject(value.modifier)&&typeof value.modifier.measure==='string'&&Number.isFinite(value.modifier.delta)&&typeof value.modifier.label==='string');
}
function validRunRecord(value:unknown) {
  return isObject(value)&&typeof value.id==='string'&&typeof value.scenarioId==='string'&&typeof value.completedAt==='string'&&Number.isFinite(Date.parse(value.completedAt))&&['A','B'].includes(value.pathId)&&Number.isInteger(value.score)&&value.score>=0&&value.score<=100&&['Bronze','Silver','Gold','Platinum'].includes(value.rank)&&Number.isInteger(value.stars)&&value.stars>=0&&value.stars<=3&&Array.isArray(value.decisions)&&value.decisions.length<=100&&value.decisions.every((id:unknown)=>typeof id==='string')&&validToolLog(value.toolLog)&&Number.isInteger(value.rewinds)&&value.rewinds>=0&&validDaily(value.daily)&&typeof value.bothPathsFinished==='boolean'&&finiteRecord(value.startState)&&finiteRecord(value.finalState)&&[null,'strong','workable','strained'].includes(value.outcome)&&typeof value.replayMatches==='boolean';
}
function validSession(key:string,value:unknown) {
  if(!isObject(value)||typeof value.runKey!=='string'||!isObject(value.charges)||!validToolLog(value.toolLog)||!Number.isInteger(value.rewinds)||value.rewinds<0||!Number.isInteger(value.foresightUses)||value.foresightUses<0||!Number.isInteger(value.advisorUses)||value.advisorUses<0||!validDaily(value.daily)||typeof value.clockEnabled!=='boolean'||!finiteRecord(value.startState))return false;
  const [scenarioId,path]=key.split(':');
  const validKey=key.startsWith('run-')||key.startsWith('legacy-archive-')||!!scenarioId&&['A','B'].includes(path);
  return validKey&&(!value.daily||value.daily.scenarioId===scenarioId||key.startsWith('run-'))&&Number.isInteger(value.charges.foresight)&&value.charges.foresight>=0&&value.charges.foresight<=2&&Number.isInteger(value.charges.rewind)&&value.charges.rewind>=0&&value.charges.rewind<=1&&Number.isInteger(value.charges.advisor)&&value.charges.advisor>=0&&value.charges.advisor<=1;
}
export function sanitizeProgress(value:unknown):GameProgress {
  const fallback=emptyProgress();if(!isObject(value)||value.version!==1)return fallback;
  const bestStars:Record<string,number>={};if(isObject(value.bestStars))for(const [id,n] of Object.entries(value.bestStars))if(Number.isFinite(n))bestStars[id]=Math.max(0,Math.min(3,Math.floor(n as number)));
  const personalBests:GameProgress['personalBests']={};if(isObject(value.personalBests))for(const [id,item] of Object.entries(value.personalBests))if(isObject(item)&&Number.isFinite(item.score)&&typeof item.recordId==='string')personalBests[id]={score:Math.max(0,Math.min(100,item.score)),recordId:item.recordId};
  const achievements=Array.isArray(value.achievements)?value.achievements.filter(x=>isObject(x)&&typeof x.id==='string'&&typeof x.earnedAt==='string'&&typeof x.evidence==='string').slice(0,100):[];
  const runs=Array.isArray(value.runs)?value.runs.filter(validRunRecord).slice(-50):[];
  const sessions:GameProgress['sessions']={};if(isObject(value.sessions))for(const [key,session] of Object.entries(value.sessions))if(validSession(key,session))sessions[key]=session as GameProgress['sessions'][string];
  return {version:1,bestStars,personalBests,achievements,runs,sessions,tutorialComplete:value.tutorialComplete===true,soundEnabled:value.soundEnabled===true};
}
export function retainSessions(progress:GameProgress,referencedKeys:ReadonlySet<string>):GameProgress {
  const sessions=Object.fromEntries(Object.entries(progress.sessions).filter(([key])=>referencedKeys.has(key)));
  return Object.keys(sessions).length===Object.keys(progress.sessions).length?progress:{...progress,sessions};
}
export function loadProgress(storage:StorageLike|null=browserStorage()):GameProgress {
  try { const raw=storage?.getItem(GAME_SAVE_KEY)??memoryFallback;if(!raw)return emptyProgress();return sanitizeProgress(JSON.parse(raw)); }
  catch { return emptyProgress(); }
}
export function saveProgress(progress:GameProgress,storage:StorageLike|null=browserStorage()):boolean {
  const serialized=JSON.stringify(sanitizeProgress(progress));memoryFallback=serialized;
  try { if(!storage)return false;storage.setItem(GAME_SAVE_KEY,serialized);return true; } catch { return false; }
}

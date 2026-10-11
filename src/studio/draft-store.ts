import type { Scenario } from '../scenarios/schema.ts';
import { createCustomSituation, createVariant } from './defaults.ts';
import { MAX_SITUATIONS } from './schema.ts';
import type { StudioSituation, StudioState } from './types.ts';
import { validateSituation } from './schema.ts';
import { checkBalance } from './balance-checker.ts';

export function replaceSituation(state:StudioState,item:StudioSituation):StudioState {
  const existing=state.situations.some(x=>x.id===item.id);
  if(!existing&&state.situations.length>=MAX_SITUATIONS)throw new Error('Scenario Studio is limited to 20 saved situations.');
  return {...state,situations:[...state.situations.filter(x=>x.id!==item.id),item],draft:{situation:item,step:state.draft?.situation.id===item.id?state.draft.step:0}};
}
export function beginCustom(state:StudioState):StudioState {
  const stashed=state.draft&&!state.situations.some(item=>item.id===state.draft?.situation.id)?[...state.situations,state.draft.situation]:state.situations;
  if(stashed.length>=MAX_SITUATIONS)throw new Error('Scenario Studio is limited to 20 saved situations.');
  const situation=createCustomSituation();return {...state,situations:stashed,draft:{situation,step:0}};
}
export function beginVariant(state:StudioState,base:Scenario):StudioState {
  const stashed=state.draft&&!state.situations.some(item=>item.id===state.draft?.situation.id)?[...state.situations,state.draft.situation]:state.situations;
  if(stashed.length>=MAX_SITUATIONS)throw new Error('Scenario Studio is limited to 20 saved situations.');
  const situation=createVariant(base);return {...state,situations:stashed,draft:{situation,step:0}};
}
export function updateDraft(state:StudioState,update:(item:StudioSituation)=>StudioSituation):StudioState {
  if(!state.draft)return state;
  const next=update(structuredClone(state.draft.situation));
  return {...state,draft:{...state.draft,situation:next}};
}
export function setDraftStep(state:StudioState,step:number):StudioState {
  if(!state.draft)return state;return {...state,draft:{...state.draft,step:Math.max(0,Math.min(4,step))}};
}
export function deleteSituation(state:StudioState,id:string):StudioState {
  return {...state,situations:state.situations.filter(item=>item.id!==id),draft:state.draft?.situation.id===id?null:state.draft};
}
export function restoreAtIndex<T>(items:readonly T[],index:number,item:T):T[] {
  const restored=[...items];restored.splice(Math.max(0,Math.min(index,restored.length)),0,item);return restored;
}
export function playable(item:StudioSituation){return !item.draft&&validateSituation(item).valid&&checkBalance(item).valid;}
let copySequence=0;
export function duplicateSituation(item:StudioSituation):StudioSituation {
  copySequence+=1;const clone=structuredClone(item);clone.id=`studio-copy-${Date.now().toString(36)}-${copySequence.toString(36)}`;clone.scenario.id=clone.id;clone.kind='custom';clone.title=`${item.title.slice(0,48)} — Copy`;clone.scenario.title=clone.title;clone.createdAt=new Date().toISOString();clone.updatedAt=clone.createdAt;clone.draft=true;clone.runHistory=[];delete clone.metadata.baseScenarioId;return clone;
}

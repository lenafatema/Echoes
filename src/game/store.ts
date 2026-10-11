import type { GameProgress, GameTool, RunSession, ToolLogEntry } from './types';
import { STARTING_CHARGES, spendCharge } from './tools.ts';
let serial=0;
export function newRunKey(){serial+=1;const uuid=typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`${Date.now()}-${serial}`;return `run-${uuid}`;}
export function makeRunSession(runKey:string,startState:Record<string,number>,daily:RunSession['daily']=null):RunSession {
  return {runKey,charges:{...STARTING_CHARGES},toolLog:[],rewinds:0,foresightUses:0,advisorUses:0,daily,clockEnabled:false,startState:{...startState}};
}
export function sessionKey(scenarioId:string,path:string) { return `${scenarioId}:${path}`; }
export function consumeTool(progress:GameProgress,key:string,tool:GameTool,detail:string,at=new Date().toISOString()):GameProgress|null {
  const session=progress.sessions[key];if(!session)return null;
  const charges=spendCharge(session.charges,tool);if(!charges)return null;
  const entry:ToolLogEntry={tool,at,detail};
  const updated={...session,charges,toolLog:[...session.toolLog,entry],foresightUses:session.foresightUses+(tool==='foresight'?1:0),advisorUses:session.advisorUses+(tool==='advisor'?1:0)};
  return {...progress,sessions:{...progress.sessions,[key]:updated}};
}

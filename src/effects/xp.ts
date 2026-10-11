import type { AchievementRecord, RunRecord } from '../game/types';

export interface PlannerProgress { xp:number; level:number; intoLevel:number; nextLevelAt:number; unlockedCosmetics:string[] }
export function xpForRecord(record:Pick<RunRecord,'stars'>){return Math.max(0,Math.min(3,record.stars))*25}
export function totalPlannerXp(records:readonly RunRecord[],achievements:readonly AchievementRecord[]){
  const unique=new Map<string,RunRecord>();for(const record of records)unique.set(record.id,record);
  return [...unique.values()].reduce((sum,record)=>sum+xpForRecord(record),0)+new Set(achievements.map(item=>item.id)).size*75;
}
const levels=[0,100,250,450,700,1000,1400,1850];
export function plannerLevel(xp:number):PlannerProgress{
  const safe=Math.max(0,Number.isFinite(xp)?xp:0);let index=levels.findIndex((threshold,i)=>i===levels.length-1||safe<levels[i+1]);if(index<0)index=levels.length-1;
  const start=levels[index],next=levels[Math.min(index+1,levels.length-1)];const level=index+1;
  const unlockedCosmetics=[...(level>=2?['Walnut table finish']:[]),...(level>=4?['Sandstone stamp']:[]),...(level>=6?['Amber lamp tone']:[])];
  return {xp:safe,level,intoLevel:safe-start,nextLevelAt:next,unlockedCosmetics};
}

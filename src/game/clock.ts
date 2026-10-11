export const DECISION_CLOCK_SECONDS=20;
export function firstValidClockChoice(optionIds:string[],committed:boolean) { return committed?null:optionIds[0]||null; }

export interface DecisionClockScheduler {
  now:()=>number;
  setInterval:(callback:()=>void,milliseconds:number)=>unknown;
  clearInterval:(handle:unknown)=>void;
}
const browserScheduler:DecisionClockScheduler={now:()=>Date.now(),setInterval:(callback,ms)=>window.setInterval(callback,ms),clearInterval:handle=>window.clearInterval(handle as number)};
/** Counts visible elapsed time and exposes an injected scheduler for deterministic fake-timer tests. */
export function startDecisionClock({onTick,onExpire,isPaused,isCommitted,durationSeconds=DECISION_CLOCK_SECONDS,scheduler=browserScheduler}:{onTick:(seconds:number)=>void;onExpire:()=>void;isPaused:()=>boolean;isCommitted:()=>boolean;durationSeconds?:number;scheduler?:DecisionClockScheduler}){
  let remaining=durationSeconds*1000;let last=scheduler.now();let shown=Math.ceil(remaining/1000);let stopped=false;let handle:unknown;
  const stop=()=>{if(stopped)return;stopped=true;scheduler.clearInterval(handle)};
  onTick(shown);
  handle=scheduler.setInterval(()=>{
    const now=scheduler.now();
    if(isCommitted()){stop();return;}
    if(isPaused()){last=now;return;}
    remaining-=Math.max(0,now-last);last=now;
    const seconds=Math.max(0,Math.ceil(remaining/1000));
    if(seconds!==shown){shown=seconds;onTick(seconds);}
    if(remaining<=0){stop();if(!isCommitted())onExpire();}
  },100);
  return {stop,refreshBaseline:()=>{last=scheduler.now();}};
}

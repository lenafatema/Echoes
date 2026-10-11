import { soundEvents, type SoundEvent } from './sound-events.ts';

let context:AudioContext|null=null;
let master:GainNode|null=null;
let ambient:GainNode|null=null;
let oscillators:OscillatorNode[]=[];
let lastEventAt=0;
function ensureContext(){
  if(typeof window==='undefined')return null;
  try {
    const Constructor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Constructor)return null;
    context ||= new Constructor();
    if(!master){master=context.createGain();master.gain.value=.06;master.connect(context.destination);}
    return context;
  } catch { return null; }
}
function ensureAmbient(ctx:AudioContext){
  if(ambient)return;
  ambient=ctx.createGain();ambient.gain.value=.00001;ambient.connect(master!);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;filter.connect(ambient);
  oscillators=[55,82.4].map((frequency,index)=>{const oscillator=ctx.createOscillator();const gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=index===0?.22:.1;oscillator.connect(gain);gain.connect(filter);oscillator.start();return oscillator;});
}

/** Audio begins only when called from a direct user action that enabled sound or played a cue. */
export function configureAudio(enabled:boolean,volume:number,visible:boolean,explicitGesture=false){
  if(!enabled){if(context&&ambient)ambient.gain.setTargetAtTime(.00001,context.currentTime,.04);return;}
  if(!context&&!explicitGesture)return;
  const ctx=ensureContext();if(!ctx)return;
  if(explicitGesture&&ctx.state==='suspended')void ctx.resume();
  if(explicitGesture)ensureAmbient(ctx);
  if(master)master.gain.setTargetAtTime(Math.max(0,Math.min(.07,volume*.1)),ctx.currentTime,.04);
  if(ambient)ambient.gain.setTargetAtTime(visible?Math.max(.00001,Math.min(.002,volume*.002)):.00001,ctx.currentTime,.2);
}

export function playAudioEvent(event:SoundEvent,enabled:boolean,volume=.45){
  if(!enabled)return;
  const ctx=ensureContext();if(!ctx)return;
  if(ctx.state==='suspended')void ctx.resume();
  const now=ctx.currentTime;
  // A short shared gain envelope caps overlapping cue peaks.
  if(now-lastEventAt<.018)return;
  lastEventAt=now;
  const spec=soundEvents[event],osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=spec.wave;osc.frequency.setValueAtTime(spec.frequency,now);
  if(spec.endFrequency)osc.frequency.exponentialRampToValueAtTime(spec.endFrequency,now+spec.duration);
  gain.gain.setValueAtTime(.00001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,Math.min(.03,volume*.035*spec.gain)),now+.012);gain.gain.exponentialRampToValueAtTime(.00001,now+spec.duration);
  osc.connect(gain);gain.connect(master||ctx.destination);osc.start(now);osc.stop(now+spec.duration+.015);
}

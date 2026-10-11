export type EffectMode='full'|'reduced'|'off';
export interface EffectPreferences { mode:EffectMode; cameraMovement:number; volume:number; screenShake:boolean; tableFinish:'natural'|'walnut'; lampTone:'default'|'amber' }
export const EFFECTS_SETTINGS_KEY='echoes.effects.v1';
export const defaultEffectPreferences=(mobile=false):EffectPreferences=>({mode:mobile?'reduced':'full',cameraMovement:1,volume:.45,screenShake:false,tableFinish:'natural',lampTone:'default'});
export function sanitizeEffectPreferences(value:unknown,fallback=defaultEffectPreferences()):EffectPreferences{
  if(!value||typeof value!=='object')return {...fallback};const item=value as Partial<EffectPreferences>;
  return {mode:item.mode==='full'||item.mode==='reduced'||item.mode==='off'?item.mode:fallback.mode,cameraMovement:Number.isFinite(item.cameraMovement)?Math.max(0,Math.min(1.5,item.cameraMovement!)):fallback.cameraMovement,volume:Number.isFinite(item.volume)?Math.max(0,Math.min(.7,item.volume!)):fallback.volume,screenShake:typeof item.screenShake==='boolean'?item.screenShake:fallback.screenShake,tableFinish:item.tableFinish==='walnut'?'walnut':'natural',lampTone:item.lampTone==='amber'?'amber':'default'};
}
export function loadEffectPreferences(storage:Pick<Storage,'getItem'>|null=typeof localStorage==='undefined'?null:localStorage,mobile=typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches){
  const fallback=defaultEffectPreferences(mobile);try{const raw=storage?.getItem(EFFECTS_SETTINGS_KEY);return raw?sanitizeEffectPreferences(JSON.parse(raw),fallback):fallback}catch{return fallback;}
}
export function saveEffectPreferences(value:EffectPreferences,storage:Pick<Storage,'setItem'>|null=typeof localStorage==='undefined'?null:localStorage){try{storage?.setItem(EFFECTS_SETTINGS_KEY,JSON.stringify(sanitizeEffectPreferences(value)));return !!storage}catch{return false}}
export function effectiveEffectMode(saved:EffectMode,systemReduced:boolean,staticFlag:boolean):EffectMode{if(staticFlag)return 'off';if(systemReduced)return saved==='off'?'off':'reduced';return saved;}

import { loadEffectPreferences, saveEffectPreferences, type EffectPreferences } from '../effects/settings';
export function loadAudioVolume(){return loadEffectPreferences().volume}
export function saveAudioVolume(volume:number){const current=loadEffectPreferences();return saveEffectPreferences({...current,volume:Math.max(0,Math.min(.7,volume))})}
export type { EffectPreferences };

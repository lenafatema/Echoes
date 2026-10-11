import { playAudioEvent } from '../audio/audio-engine';
import type { SoundEvent } from '../audio/sound-events';
export type SoundCue=SoundEvent;
export function playGameSound(cue:SoundCue,enabled:boolean,volume=.45) { playAudioEvent(cue,enabled,volume); }

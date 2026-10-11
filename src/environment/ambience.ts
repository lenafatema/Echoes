import type { Scenario } from '../scenarios/schema';
export type RoomAmbience='dry'|'overcast'|'rain'|'evening';
/** Cosmetic mapping only; no environmental state is written into the scenario engine. */
export function ambienceFor(scenario:Scenario|null,remainingTime:number):RoomAmbience{
  if(remainingTime<=.12)return 'evening';
  if(scenario?.id==='flood-relief-camp'||scenario?.id==='harvest-before-rains')return 'rain';
  if(scenario?.id==='film-shoot-weather')return 'overcast';
  return 'dry';
}

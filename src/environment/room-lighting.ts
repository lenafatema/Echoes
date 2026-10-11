import { colors } from '../tokens/colors.ts';
import type { Scenario } from '../scenarios/schema';

export interface RoomLighting { remainingTime:number; lampIntensity:number; windowTint:string; lampTint:string }
export function roomLightingFor(scenario:Scenario|null,state:Record<string,number>|null):RoomLighting{
  const measure=scenario?.measures.find(item=>item.role==='time');
  const remainingTime=measure&&state?Math.max(0,Math.min(1,(state[measure.key]-measure.domain[0])/Math.max(1e-9,measure.domain[1]-measure.domain[0]))):.5;
  return {remainingTime,lampIntensity:.18+(1-remainingTime)*.34,windowTint:remainingTime<.25?colors.neutrals.espresso900:colors.neutrals.walnut800,lampTint:remainingTime<.25?colors.neutrals.sand300:colors.neutrals.umber600};
}

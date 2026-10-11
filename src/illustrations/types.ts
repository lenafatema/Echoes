import type { Scenario } from '../scenarios/schema';
export type SceneProps={scenario:Scenario;state:Record<string,number>;active?:boolean;eventTick?:number};

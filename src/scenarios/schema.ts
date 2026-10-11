export type MeasureRole = 'resources' | 'time' | 'people' | 'progress';
export type MeasureFormat = 'rupees' | 'lakhs' | 'days' | 'hours' | 'points' | 'percent' | 'count';
export interface MeasureDefinition { key: string; role: MeasureRole; label: string; format: MeasureFormat; domain: [number, number]; higherIsBetter: boolean }
export interface Effect { measure: string; delta: number; reason: string }
export interface ScenarioOption { id: string; title: string; detail: string; effects: Effect[]; timeCost?: number }
export interface ScenarioEvent { id: string; title: string; description: string; why: string }
export interface TriggerRule { id: string; step: number; optionId: string; eventId: string; why: string; effects?: Effect[] }
export interface ThresholdRule { id: string; measure: string; eventId?: string; atMost?: number; below?: number; effects: Effect[]; why: string }
export interface Scenario {
  id: string; title: string; difficulty: 'Easy' | 'Medium' | 'Hard'; contextLine: string; tone: string;
  /** Calendar day on which the recorded scenario begins. The time measure remains independent. */
  startingDay?: number;
  intro: { summary: string; objective: string }; openingEventId: string; openingEffects?: Effect[];
  measures: MeasureDefinition[]; startingState: Record<string, number>; steps: number;
  events: ScenarioEvent[]; options: ScenarioOption[]; triggers: TriggerRule[];
  drift: Effect[]; thresholds: ThresholdRule[];
  outcomes: { id: 'strong' | 'workable' | 'strained'; label: string; minScore: number }[];
  scoreWeights: Record<string, number>; footer: string;
}

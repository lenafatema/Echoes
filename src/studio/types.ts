import type { Scenario } from '../scenarios/schema';

export type StudioKind = 'custom' | 'edited' | 'imported';
export type StudioTheme = 'stage' | 'office' | 'kitchen' | 'hall' | 'set' | 'field' | 'workshop' | 'generic';
export interface StudioCriterion { measure: string; min?: number; max?: number; description: string }
export interface StudioMetadata {
  theme: StudioTheme;
  mission: StudioCriterion[];
  mastery: StudioCriterion[];
  samplePath: [string, string, string];
  baseScenarioId?: string;
}
export interface StudioSituation {
  id: string;
  kind: StudioKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  scenario: Scenario;
  metadata: StudioMetadata;
  draft: boolean;
  runHistory: Array<{ runId:string; at: string; decisions: string[]; state: Record<string, number>; outcome: string | null }>;
}
export interface StudioDraft { situation: StudioSituation; step: number }
export interface StudioState { version: 1; situations: StudioSituation[]; draft: StudioDraft | null }
export interface ValidationIssue { path: string; message: string; severity: 'error' | 'warning' }
export interface ScenarioValidation { valid: boolean; issues: ValidationIssue[] }

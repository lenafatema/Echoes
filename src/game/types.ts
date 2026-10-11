import type { Outcome, PathId, Run } from '../engine/engine';

export type GameTool = 'foresight' | 'rewind' | 'advisor';
export type ToolCharges = Record<GameTool, number>;
export type Rank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export interface Criterion { measure: string; min?: number; max?: number; description: string }
export interface MissionConfig {
  scenarioId: string;
  title: string;
  description: string;
  mission: Criterion[];
  mastery: Criterion[];
  weights: { resources: number; time: number; people: number; progress: number; stars: number; unusedTools: number };
  ranks: Record<Rank, number>;
}
export interface StarResult { earned: boolean; unmet: string[] }
export interface StarEvaluation { completion: StarResult; mission: StarResult; mastery: StarResult; count: number }
export interface ToolLogEntry { tool: GameTool | 'rewind'; at: string; detail: string }
export interface RunSession {
  runKey: string;
  charges: ToolCharges;
  toolLog: ToolLogEntry[];
  rewinds: number;
  foresightUses: number;
  advisorUses: number;
  daily: DailyChallenge | null;
  clockEnabled: boolean;
  startState: Record<string, number>;
}
export interface DailyChallenge { date: string; scenarioId: string; modifier: { measure: string; delta: number; label: string } }
export interface RunRecord {
  id: string;
  scenarioId: string;
  completedAt: string;
  pathId: PathId;
  score: number;
  rank: Rank;
  stars: number;
  starEvaluation: StarEvaluation;
  decisions: string[];
  toolLog: ToolLogEntry[];
  rewinds: number;
  daily: DailyChallenge | null;
  bothPathsFinished: boolean;
  startState: Record<string, number>;
  finalState: Record<string, number>;
  outcome: Outcome | null;
  replayMatches: boolean;
}
export interface AchievementRecord { id: string; earnedAt: string; evidence: string }
export interface GameProgress {
  version: 1;
  bestStars: Record<string, number>;
  personalBests: Record<string, { score: number; recordId: string }>;
  achievements: AchievementRecord[];
  runs: RunRecord[];
  sessions: Record<string, RunSession>;
  tutorialComplete: boolean;
  soundEnabled: boolean;
}
export interface ScoreResult { score: number; components: Record<string, number>; rank: Rank; nextRank: Rank | null; nextThreshold: number | null }
export interface ReplayResult { run: Run | null; matches: boolean; reason?: string }

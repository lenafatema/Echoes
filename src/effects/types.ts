import type { RecordedChange, Run } from '../engine/engine';

export type PresentationEventType = 'decision' | 'stinger' | 'day' | 'ending' | 'rewind' | 'tool' | 'reward';
export interface PresentationEvent {
  readonly id: string;
  readonly runId: string;
  readonly scenarioId: string;
  readonly sourceEventId: string;
  readonly type: PresentationEventType;
  readonly title: string;
  readonly changes: readonly Readonly<RecordedChange>[];
  readonly before?: Readonly<Record<string, number>>;
  readonly after?: Readonly<Record<string, number>>;
}

export type PresentationEffectListener = (event: PresentationEvent) => void;

export interface EventSource {
  run: Run;
  previous?: Run;
}

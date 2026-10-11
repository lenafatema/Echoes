import type { Run } from '../engine/engine';
import type { Scenario } from '../scenarios/schema';

export interface TreeRun {
  /** Unique within the saved scenario, including archived replays. */
  key: string;
  label: string;
  run: Run;
  archived?: boolean;
}

export interface BranchTreeNode {
  id: string;
  runKey: string;
  runId: Run['id'];
  historyIndex: number;
  decisionCount: number;
  label: string;
  state: Record<string, number>;
  day: number;
  status: Run['status'];
  outcome: Run['outcome'];
  archived: boolean;
}

/** Projects stored engine snapshots into a navigable view. No states are simulated here. */
export function branchTreeFor(scenario: Scenario, paths: TreeRun[]): BranchTreeNode[] {
  return paths.flatMap(path => path.run.history.map((snapshot, historyIndex) => {
    const decisionId = historyIndex > 0 ? path.run.decisions[historyIndex - 1] : undefined;
    const optionTitle = scenario.options.find(option => option.id === decisionId)?.title;
    const outcomeLabel = scenario.outcomes.find(outcome => outcome.id === snapshot.outcome)?.label || 'Final state';
    const label = historyIndex === 0
      ? 'Opening position'
      : snapshot.status === 'completed'
        ? `${optionTitle ? `Decision ${snapshot.decisionCount} · ${optionTitle} · ` : ''}${outcomeLabel}`
        : optionTitle || `Recorded state ${historyIndex + 1}`;
    return {
      id: `${path.key}:state:${historyIndex}`,
      runKey: path.key,
      runId: path.run.id,
      historyIndex,
      decisionCount: snapshot.decisionCount,
      label,
      state: { ...snapshot.state },
      day: snapshot.day,
      status: snapshot.status,
      outcome: snapshot.outcome,
      archived: !!path.archived,
    };
  }));
}

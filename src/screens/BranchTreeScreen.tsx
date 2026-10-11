import type { Scenario } from '../scenarios/schema';
import { formatMeasure } from '../engine/engine';
import type { BranchTreeNode, TreeRun } from '../branch-tree/branchTreeAdapter';

export function BranchTreeScreen({ scenario, paths, nodes, selectedId, onSelect, onInspect, onReturn }: {
  scenario: Scenario;
  paths: TreeRun[];
  nodes: BranchTreeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  onInspect: (id: string) => void;
  onReturn: () => void;
}) {
  const selected = nodes.find(node => node.id === selectedId) || nodes[0];
  if (!selected) return null;
  const selectedPath = paths.find(path => path.key === selected.runKey);
  const chartHeight = Math.max(78, paths.length * 34 + 28);
  return <section className="lib-screen branch-tree-screen" aria-labelledby="tree-title">
    <div className="tree-copy">
      <p className="eyebrow">Recorded states · {scenario.title}</p>
      <h1 id="tree-title">Decision history</h1>
      <p className="tree-intro">Each point is a saved engine snapshot. Select a recorded state to restore that branch.</p>
      <svg className="branch-tree-diagram" viewBox={`0 0 720 ${chartHeight}`} role="img" aria-label={`Recorded decision tree with ${paths.length} saved path${paths.length === 1 ? '' : 's'}`}>
        {paths.map((path, pathIndex) => {
          const pathNodes = nodes.filter(node => node.runKey === path.key);
          const row = 22 + pathIndex * 34;
          const positions = pathNodes.map((node, index) => `${48 + index * (624 / Math.max(1, pathNodes.length - 1))},${row - Math.min(9, node.decisionCount * 2)}`).join(' ');
          return <g key={path.key} className={path.run.id === 'B' || path.archived ? 'tree-line-alternate' : 'tree-line-primary'}>
            <polyline points={positions}/>{pathNodes.map((node, index) => <circle key={node.id} cx={48 + index * (624 / Math.max(1, pathNodes.length - 1))} cy={row - Math.min(9, node.decisionCount * 2)} r={node.id === selected.id ? 5 : node.status === 'completed' ? 4 : 3}/>)}</g>;
        })}
      </svg>
      <div className="tree-selected" aria-live="polite">
        <p className="eyebrow">{selectedPath?.label || `Path ${selected.runId}`} · Day {selected.day}</p>
        <h2>{selected.label}</h2>
        <div className="tree-measures">{scenario.measures.map(measure => <div key={measure.key}><small>{measure.label}</small><strong>{formatMeasure(scenario, measure.key, selected.state[measure.key])}</strong></div>)}</div>
      </div>
      <div className="tree-paths">
        {paths.map(path => <section className="tree-path" key={path.key} aria-label={`${path.label} recorded history`}>
          <p className="eyebrow">{path.label}{path.archived ? ' · Archived' : ''}</p>
          <div className="tree-nodes">
            {nodes.filter(node => node.runKey === path.key).map((node, index) => <button key={node.id} className={`tree-node ${node.id === selected.id ? 'is-selected' : ''}`} aria-current={node.id === selected.id ? 'step' : undefined} onFocus={() => onSelect(node.id)} onMouseEnter={() => onSelect(node.id)} onClick={() => onInspect(node.id)}>
              <span>{String(index + 1).padStart(2, '0')}</span><strong>{node.label}</strong>
            </button>)}
          </div>
        </section>)}
      </div>
      <div className="tree-actions"><button className="text-button" onClick={onReturn}>Return to result</button><button className="primary-button" onClick={() => onInspect(selected.id)}>Restore selected state</button></div>
    </div>
  </section>;
}

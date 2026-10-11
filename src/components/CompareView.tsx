import { Branch, Metric, format } from '../simulation/engine';

const rows: { id: Metric; label: string }[] = [
  { id: 'budget', label: 'Budget remaining' }, { id: 'days', label: 'Days remaining' },
  { id: 'morale', label: 'Team morale' }, { id: 'readiness', label: 'Event readiness' },
];
function comparisonSentence(a: Branch, b: Branch) {
  const differences = rows.map(({ id, label }) => ({ id, label: label.toLowerCase(), delta: a.state[id] - b.state[id] })).filter(item => item.delta !== 0);
  if (!differences.length) return 'The two recorded paths finish at the same values for all four metrics.';
  const clauses = differences.map(({ id, label, delta }) => {
    const better = delta > 0 ? 'Path A' : 'Path B';
    if (id === 'budget') return `${better} has ₹${Math.abs(delta).toLocaleString('en-IN')} more budget remaining`;
    if (id === 'days') return `${better} has ${Math.abs(delta)} more day${Math.abs(delta) === 1 ? '' : 's'} remaining`;
    return `${better} has ${Math.abs(delta)} more point${Math.abs(delta) === 1 ? '' : 's'} of ${label}`;
  });
  const last = clauses[clauses.length - 1];
  return `${clauses.slice(0, -1).join('; ')}${clauses.length > 1 ? '; and ' : ''}${last}.`;
}

interface Props { branchA: Branch; branchB: Branch; activeId: 'A' | 'B'; onTryAnother: () => void; onSelectBranch: (id: 'A' | 'B') => void }

export function CompareSpread({ branchA, branchB, activeId, onTryAnother, onSelectBranch }: Props) {
  return <section className="comparison-spread" aria-labelledby="compare-heading">
    <div className="spread-heading"><span className="data-label">FIGURE 02 · COMPARATIVE STATEMENT</span><h2 id="compare-heading">Two outcomes, one opening position</h2><p>Each path begins with the same ₹50,000 budget and seven days remaining. Signed differences show Path A minus Path B.</p></div>
    <div className="spread-table" role="table" aria-label="Path outcome comparison">
      <div className="spread-row spread-head" role="row"><span role="columnheader">MEASURE</span><span role="columnheader">PATH A · {branchA.decision.toUpperCase()}</span><span role="columnheader">DIFFERENCE</span><span role="columnheader">PATH B · {branchB.decision.toUpperCase()}</span></div>
      {rows.map(({ id, label }) => {
        const difference = branchA.state[id] - branchB.state[id];
        const value = id === 'budget' ? `₹${Math.abs(difference).toLocaleString('en-IN')}` : id === 'days' ? `${Math.abs(difference)}d` : `${Math.abs(difference)} pts`;
        return <div className="spread-row" role="row" key={id}>
          <span role="rowheader">{label}</span><strong className="spread-value" role="cell">{format(id, branchA.state[id])}</strong>
          <span className="spread-delta" role="cell">{difference === 0 ? '—' : `${difference > 0 ? '+' : '−'}${value}`}</span>
          <strong className="spread-value" role="cell">{format(id, branchB.state[id])}</strong>
        </div>;
      })}
      <div className="spread-row" role="row"><span role="rowheader">Festival outcome</span><strong className="spread-value" role="cell">{branchA.outcome ? outcomeLabel(branchA.outcome) : 'In progress'}</strong><span className="spread-delta" role="cell">—</span><strong className="spread-value" role="cell">{branchB.outcome ? outcomeLabel(branchB.outcome) : 'In progress'}</strong></div>
      <div className="spread-events"><span className="data-label">RECORDED ENTRIES</span><p>Path A · {branchA.events.map(event => event.title).join(' / ')}</p><p>Path B · {branchB.events.map(event => event.title).join(' / ')}</p></div>
    </div>
    <p className="spread-conclusion">{comparisonSentence(branchA, branchB)}</p>
    <div className="spread-actions"><span className="data-label">ACTIVE PATH · {activeId}</span><button aria-pressed={activeId === 'A'} onClick={() => onSelectBranch('A')}>Read Path A</button><button aria-pressed={activeId === 'B'} onClick={() => onSelectBranch('B')}>Read Path B</button><button className="action-red" onClick={onTryAnother}>Try another response →</button></div>
  </section>;
}

function outcomeLabel(outcome: NonNullable<Branch['outcome']>) {
  return outcome === 'ready' ? 'Ready to open' : outcome === 'compromises' ? 'Open with compromises' : 'Event at risk';
}

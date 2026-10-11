import { useEffect, useState } from 'react';
import { BranchId, INITIAL, Metric, State, format } from '../simulation/engine';

const metrics: { id: Metric; label: string; unit: string }[] = [
  { id: 'budget', label: 'Budget', unit: 'remaining' },
  { id: 'days', label: 'Time', unit: 'days remaining' },
  { id: 'morale', label: 'Morale', unit: 'out of 100' },
  { id: 'readiness', label: 'Readiness', unit: 'out of 100' },
];

interface Props {
  state: State;
  activeId: BranchId;
  hasBranch: boolean;
  trace: Metric | null;
  preview: boolean;
  onWhy: (metric: Metric) => void;
  onMetricHover: (metric: Metric | null) => void;
}

function AnimatedValue({ value, metric, reducedMotion }: { value: number; metric: Metric; reducedMotion: boolean }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (reducedMotion || typeof requestAnimationFrame !== 'function') { setDisplay(value); return; }
    const from = display;
    const startedAt = performance.now();
    let frame = 0;
    const update = (now: number) => {
      try {
        const progress = Math.min(1, (now - startedAt) / 320);
        setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(update);
      } catch { setDisplay(value); }
    };
    try { frame = requestAnimationFrame(update); } catch { setDisplay(value); }
    return () => { try { cancelAnimationFrame(frame); } catch { /* Animation is optional. */ } };
  // The value is intentionally animated from the last displayed number.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion]);
  return metric === 'budget' ? `₹${display.toLocaleString('en-IN')}` : display;
}

export function MetricsStrip({ state, activeId, hasBranch, trace, preview, onWhy, onMetricHover, reducedMotion }: Props & { reducedMotion: boolean }) {
  return <section className="metrics-strip" aria-label="Current simulation metrics">
    {metrics.map(({ id, label, unit }) => {
      const delta = preview ? 0 : state[id] - INITIAL[id];
      const changeText = delta === 0 ? '' : `${delta > 0 ? '↑ +' : '↓ −'}${id === 'budget' ? `₹${Math.abs(delta).toLocaleString('en-IN')}` : id === 'days' ? `${Math.abs(delta)}d` : `${Math.abs(delta)} pts`}`;
      return <button key={id} className={`metric-ledger ${trace === id ? 'is-selected' : ''}`} data-metric={id} onClick={() => onWhy(id)} onMouseEnter={() => onMetricHover(id)} onMouseLeave={() => onMetricHover(null)} onFocus={() => onMetricHover(id)} onBlur={() => onMetricHover(null)} aria-label={`${label}: ${format(id, state[id])}. Open explanation.`} aria-pressed={trace === id}>
        <span className="metric-ledger-label">{label.toUpperCase()} <span>· {unit.toUpperCase()}</span></span>
        <span className="metric-ledger-value"><AnimatedValue value={state[id]} metric={id} reducedMotion={reducedMotion}/></span>
        <span className={`metric-ledger-change ${delta ? 'has-change' : ''}`} aria-live="polite">{changeText || (hasBranch ? 'No net change' : 'Starting value')}</span>
      </button>;
    })}
    <span className="metric-state" aria-hidden="true">PATH {activeId}{preview ? ' · EARLIER STATE' : ''}</span>
  </section>;
}

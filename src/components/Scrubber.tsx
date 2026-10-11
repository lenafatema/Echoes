import { Branch } from '../simulation/engine';

interface Props { branch?: Branch; preview: number | null; onPreview: (step: number) => void; onLatest: () => void }

export function TimelineScrubber({ branch, preview, onPreview, onLatest }: Props) {
  const max = Math.max(0, (branch?.history.length || 1) - 1);
  const value = preview ?? max;
  const snapshot = branch?.history[value];
  return <section className="timeline-scrubber" aria-label="Recorded simulation history">
    <div className="scrubber-title"><span className="data-label">REWIND / REVIEW</span><strong>{snapshot ? `${snapshot.label} · ${snapshot.state.days} days remaining` : 'No recorded entries'}</strong></div>
    <div className="scrubber-control">
      <div className="scrubber-ticks" aria-hidden="true">{branch?.history.map((item, index) => <span key={index} style={{ left: `${max ? index / max * 100 : 0}%` }}>{item.step === 0 ? 'START' : `ENTRY ${item.step}`}</span>)}</div>
      <input type="range" aria-label="Rewind to a recorded state" aria-valuetext={snapshot ? `${snapshot.label}, ${snapshot.state.days} days remaining` : 'No recorded state'} min={0} max={max} step={1} value={value} disabled={!branch || max === 0} onChange={event => onPreview(Number(event.currentTarget.value))}/>
    </div>
    {preview !== null && <button className="text-action action-red latest-action" onClick={onLatest}>Return to latest state →</button>}
  </section>;
}

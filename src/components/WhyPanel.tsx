import { Branch, Change, INITIAL, Metric, SimEvent, format } from '../simulation/engine';
import { formatAnnotationTitle } from './EditorialParts';

interface Props { metric: Metric; branch?: Branch; events: SimEvent[]; current: number; records: { event: SimEvent; change: Change }[]; onHighlight: (id: string) => void }

export function WhyThisHappened({ metric, branch, events, current, records, onHighlight }: Props) {
  const relevant = events.filter(event => event.changes.some(change => change.metric === metric));
  return <section className="why-ledger" aria-labelledby="why-heading">
    <div className="section-overline"><span className="data-label">RULE TRACE · {formatAnnotationTitle(metric).toUpperCase()}</span><span className="data-label">PATH {branch?.id ?? '—'}</span></div>
    <h2 id="why-heading">Why this happened</h2>
    <p className="why-opening">The main sponsor's withdrawal established the ₹15,000 gap. The trace below follows the selected metric from its opening value through each recorded rule.</p>
    <ol className="why-sequence">
      <li><span className="why-step">00</span><div><span className="data-label">TRIGGERING EVENT</span><p>Main sponsor withdrew. Opening {formatAnnotationTitle(metric).toLowerCase()}: {format(metric, INITIAL[metric])}.</p></div></li>
      {relevant.length ? relevant.map((event, index) => {
        const change = event.changes.find(item => item.metric === metric)!;
        return <li key={event.id} className="why-record">
          <span className="why-step">{String(index + 1).padStart(2, '0')}</span>
          <div><span className="data-label">DECISION / CONSEQUENCE · ENTRY {event.step}</span><h3>{event.title}</h3><p>{event.description}</p><p className="why-rule">Rule applied: {change.rule}</p><p className="why-result">{formatAnnotationTitle(metric)} changed from {format(metric, change.before)} to {format(metric, change.after)} ({change.delta > 0 ? '+' : ''}{change.delta}).</p><button onClick={() => onHighlight(event.id)}>Locate this entry on the timeline →</button></div>
        </li>;
      }) : <li><span className="why-step">—</span><div><span className="data-label">NO RECORDED CHANGE</span><p>This metric remains at its opening value in the selected state.</p></div></li>}
    </ol>
    <p className="why-current">Current {formatAnnotationTitle(metric).toLowerCase()}: <strong>{format(metric, current)}</strong>. {records.length} recorded rule effect{records.length === 1 ? ' affects' : 's affect'} this metric.</p>
  </section>;
}

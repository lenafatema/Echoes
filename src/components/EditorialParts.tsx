import { Branch, Change, INITIAL, Metric, SimEvent, State } from '../simulation/engine';

export interface AnnotationRecord { event: SimEvent; change: Change; number: number }

export function SituationHeader({ days, currentDay }: { days: number; currentDay: number }) {
  return <section className="situation-header" aria-labelledby="situation-title">
    <div className="situation-caption"><span>CASE 01</span><span>COLLEGE TECHNOLOGY FESTIVAL</span><span>DAY {String(currentDay).padStart(2, '0')} · {days} DAYS TO OPEN</span></div>
    <h1 id="situation-title">A festival budget, after the sponsor withdrew.</h1>
    <p>On day two the main sponsor withdrew. The event is seven days away; the original ₹50,000 budget now has a ₹15,000 gap. The team must make a series of decisions before opening day.</p>
  </section>;
}

export function OpeningPage({ onBegin, onContinue, onNewRun, hasSavedGame, hasPreviousRun, previousRunSummary }: { onBegin: () => void; onContinue: () => void; onNewRun: () => void; hasSavedGame: boolean; hasPreviousRun: boolean; previousRunSummary?: string }) {
  return <main className="opening-page" aria-labelledby="opening-title">
    <div className="opening-kicker"><span className="wordmark">ECHOES</span><span className="publication-name">DECISION LEDGER</span><span className="data-label">A PLAYABLE CASE STUDY · 01</span></div>
    <h1 id="opening-title">The College<br/>Tech Fest</h1>
    <p className="opening-deck">Seven days to opening. ₹50,000 to work with. One unexpected withdrawal.</p>
    <p className="opening-copy">You are responsible for preparing the festival after its principal sponsor leaves. Each response changes the budget, time, team morale, and readiness. The rules are fixed; the outcome follows the decisions.</p>
    <div className="opening-conditions" aria-label="Starting conditions">
      <div><span className="data-label">TIME</span><strong>{INITIAL.days} days</strong></div>
      <div><span className="data-label">BUDGET</span><strong>₹{INITIAL.budget.toLocaleString('en-IN')}</strong></div>
      <div><span className="data-label">MORALE</span><strong>{INITIAL.morale} / 100</strong></div>
      <div><span className="data-label">READINESS</span><strong>{INITIAL.readiness} / 100</strong></div>
    </div>
    <p className="opening-objective"><span className="data-label">OBJECTIVE</span><span>Prepare the festival for opening day without exhausting the budget or the team.</span></p>
    <div className="opening-actions">{hasSavedGame ? <><button className="text-action action-red" onClick={onContinue}>Continue saved run <span aria-hidden="true">→</span></button><button className="text-action" onClick={onNewRun}>Begin a new run</button></> : <button className="text-action action-red" onClick={onBegin}>Begin the simulation <span aria-hidden="true">→</span></button>}{hasPreviousRun && <span className="data-label">A previous run is retained in saved history.</span>}</div>
    {hasPreviousRun && previousRunSummary && <p className="opening-archive">Previous run retained: {previousRunSummary}</p>}
    <p className="opening-disclaimer">Illustrative model. Values are assumptions, not forecasts.</p>
  </main>;
}

interface AnnotationProps {
  records: AnnotationRecord[];
  hoveredMetric: Metric | null;
  activeAnnotation: string | null;
  pinnedAnnotation: string | null;
  onHover: (record: AnnotationRecord | null) => void;
  onPin: (record: AnnotationRecord) => void;
}

export function MarginAnnotations({ records, hoveredMetric, activeAnnotation, pinnedAnnotation, onHover, onPin }: AnnotationProps) {
  const shownRecords = records.filter(record => !hoveredMetric || record.change.metric === hoveredMetric);
  return <aside className="margin-notes" aria-labelledby="notes-heading">
    <div className="margin-heading"><span className="data-label">MARGINAL NOTES</span><h2 id="notes-heading">Recorded consequences</h2></div>
    {shownRecords.length ? <ol className="annotation-list">
      {shownRecords.map(record => {
        const id = `${record.event.id}:${record.change.metric}`;
        const amount = record.change.metric === 'budget' ? `₹${Math.abs(record.change.delta).toLocaleString('en-IN')}` : record.change.metric === 'days' ? `${Math.abs(record.change.delta)} day${Math.abs(record.change.delta) === 1 ? '' : 's'}` : `${Math.abs(record.change.delta)} points`;
        const direction = record.change.delta > 0 ? '+' : record.change.delta < 0 ? '−' : '±';
        return <li key={id} className={`annotation-item ${activeAnnotation === id ? 'is-active' : ''} ${pinnedAnnotation === id ? 'is-pinned' : ''}`} data-annotation-id={id}>
          <button aria-pressed={pinnedAnnotation === id} onMouseEnter={() => onHover(record)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(record)} onBlur={() => onHover(null)} onClick={() => onPin(record)}>
            <sup>{String(record.number).padStart(2, '0')}</sup>
            <span><strong>{record.change.metric.toUpperCase()} {direction}{amount}</strong><span className="annotation-event">{record.event.title} · Path {record.event.branchId}</span><span className="annotation-rule">{record.change.rule}</span></span>
            <span className="annotation-pin" aria-hidden="true">{pinnedAnnotation === id ? 'PINNED' : 'NOTE'}</span>
          </button>
        </li>;
      })}
    </ol> : <p className="notes-empty">No consequences have been recorded. Choose a response to begin the ledger.</p>}
    <p className="margin-context"><sup>†</sup> The base state begins with ₹50,000 and seven days remaining. Each note is tied to a recorded rule effect.</p>
  </aside>;
}

export function ClosingAssessment({ state, branch, events, onTryAnother }: { state: State; branch?: Branch; events: SimEvent[]; onTryAnother: () => void }) {
  const deltaBudget = state.budget - 50000;
  const deltaDays = state.days - 7;
  const deltaMorale = state.morale - 75;
  const deltaReadiness = state.readiness - 65;
  const decisions = branch?.decisions.map(decision => decision.title.toLowerCase()) || [];
  const entry = branch && decisions.length ? `Path ${branch.id} records ${decisions.join('; then ')}.` : 'No path has been recorded yet.';
  const ending = branch?.outcome ? ` Opening-day assessment: ${branch.outcome === 'ready' ? 'ready to open' : branch.outcome === 'compromises' ? 'open with compromises' : 'event at risk'}.` : '';
  const deltas = [
    deltaBudget ? `budget ${deltaBudget > 0 ? 'rose' : 'fell'} by ₹${Math.abs(deltaBudget).toLocaleString('en-IN')}` : '',
    deltaDays ? `time ${deltaDays > 0 ? 'increased' : 'fell'} by ${Math.abs(deltaDays)} day${Math.abs(deltaDays) === 1 ? '' : 's'}` : '',
    deltaMorale ? `morale ${deltaMorale > 0 ? 'rose' : 'fell'} by ${Math.abs(deltaMorale)} points` : '',
    deltaReadiness ? `readiness ${deltaReadiness > 0 ? 'rose' : 'fell'} by ${Math.abs(deltaReadiness)} points` : '',
  ].filter(Boolean);
  return <section className="closing-assessment" aria-labelledby="closing-heading">
    <span className="data-label">CLOSING ASSESSMENT</span><h2 id="closing-heading">The recorded position</h2>
    <p>{entry}{ending} {deltas.length ? `Against the opening state, ${deltas.join('; ')}.` : 'The recorded state remains at the opening values.'} The simulation does not estimate attendance or final event quality beyond the stated rules.</p>
    {branch && <button className="text-action action-red" onClick={onTryAnother}>Try another path <span aria-hidden="true">→</span></button>}
  </section>;
}

export function formatAnnotationTitle(metric: Metric) {
  return metric === 'days' ? 'Days remaining' : metric === 'budget' ? 'Budget remaining' : metric === 'morale' ? 'Team morale' : 'Event readiness';
}

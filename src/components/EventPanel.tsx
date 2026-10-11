import { Branch, DecisionId, DecisionOption, GameStatus, OutcomeId, SimEvent, Situation, State } from '../simulation/engine';

interface Props {
  started: boolean;
  state: State;
  branch?: Branch;
  events: SimEvent[];
  decisionPoint: boolean;
  busy: boolean;
  notice: string;
  onBegin: () => void;
  onChoose: (decision: DecisionId) => void;
  onLatest: () => void;
  onSkip: () => void;
  onRunAlternate: () => void;
  situation: Situation;
  options: DecisionOption[];
  currentDay: number;
  daysTotal: number;
  awaitAdvance: boolean;
  canAdvance: boolean;
  status: GameStatus;
  outcome: OutcomeId | null;
  onAdvance: () => void;
  onNewRun: () => void;
  onReview: () => void;
}

export function LedgerEntry({ started, state, branch, events, decisionPoint, busy, notice, onBegin, onChoose, onLatest, onSkip, onRunAlternate, situation, options, currentDay, daysTotal, awaitAdvance, canAdvance, status, outcome, onAdvance, onNewRun, onReview }: Props) {
  const canChoose = started && status === 'active' && (!branch || decisionPoint || !awaitAdvance);
  const outcomeCopy = outcome === 'ready'
    ? ['Ready to open', 'Readiness is at least 78, morale is at least 45, and the budget remains viable.']
    : outcome === 'compromises'
      ? ['Open with compromises', `${state.readiness < 78 ? `Readiness is ${state.readiness}, below the 78-point opening threshold` : `Morale is ${state.morale}, below the 45-point opening threshold`}; the budget remains viable.`]
      : ['Event at risk', `Readiness is ${state.readiness}, below the 55-point threshold for proceeding.`];
  return <section className="ledger-entry" aria-labelledby="entry-heading">
    <header className="entry-header">
      <span className="data-label">ENTRY {String(situation.entry).padStart(2, '0')} <span className="entry-separator">/</span> DAY {String(currentDay).padStart(2, '0')} OF {String(daysTotal).padStart(2, '0')}</span>
      <span className="data-label">{branch ? `PATH ${branch.id} · ${state.days} DAYS REMAINING` : 'OPENING POSITION'}</span>
    </header>
    <h2 id="entry-heading">{status === 'completed' ? outcomeCopy[0] : awaitAdvance ? 'Consequences recorded.' : situation.title}</h2>
    <p className="entry-intro">{status === 'completed' ? outcomeCopy[1] : awaitAdvance ? situationForIntermission(situation).description : situation.description}</p>
    {!status || status === 'active' ? <p className="entry-why">{awaitAdvance ? 'Review the recorded effects, then advance the calendar to continue.' : situation.why}</p> : null}

    {events.length > 0 && <div className="recorded-entries" aria-label={`Recorded entries for Path ${branch?.id}`}>
      {events.map((event, index) => <article className="recorded-entry" key={event.id}>
        <div className="recorded-entry-meta"><span className="data-label">ENTRY {String(event.step + 1).padStart(2, '0')}</span><span className="data-label">{branch?.history.find(point => point.eventCount > index)?.state.days ?? state.days} DAYS REMAINING</span><span className="data-label">PATH {event.branchId}</span></div>
        <h3>{event.title}</h3><p>{event.description}</p>
      </article>)}
    </div>}

    {!started ? <div className="begin-row"><p>Choose how the team responds. Each option records its stated rule and resulting state.</p><button className="text-action action-red" onClick={onBegin}>Begin the simulation <span aria-hidden="true">→</span></button></div> : status === 'completed' ? <div className="ending-actions"><p className="ending-outcome">{outcomeCopy[0]}<br/><span>{outcomeCopy[1]}</span></p><button className="text-action" onClick={onReview}>Review this run</button><button className="text-action action-red" onClick={onNewRun}>Play again →</button></div> : <>
      {awaitAdvance ? <div className="begin-row"><p>{situation.why}</p><button className="text-action action-red" disabled={!canAdvance} onClick={onAdvance}>Advance to next day <span aria-hidden="true">→</span></button></div> : <>
      <div className="option-heading"><span className="data-label">AVAILABLE DECISIONS</span><span className="data-label">SELECT 1—{options.length}</span></div>
      <ol className="decision-options">
        {options.map((decision, index) => <li key={decision.id}>
          <button className={`decision-option ${branch?.decisions[branch.decisions.length - 1]?.id === decision.id && !decisionPoint ? 'is-selected' : ''}`} onClick={() => onChoose(decision.id)} disabled={!canChoose || busy} aria-pressed={branch?.decisions[branch.decisions.length - 1]?.id === decision.id && !decisionPoint}>
            <span className="option-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="option-copy"><span className="option-title">Option {index + 1} — {decision.title}</span><span className="option-description">{decision.detail}</span></span>
            <span className="option-mark" aria-hidden="true">KEY {decision.key}</span>
          </button>
        </li>)}
      </ol>
      {busy && <button className="text-action action-red skip-action" onClick={onSkip}>Skip transition</button>}
      </>}{branch && <div className="entry-actions">
        {decisionPoint && <button className="text-action" onClick={onLatest}>Return to latest entry</button>}
        <button className="text-action action-red" onClick={onRunAlternate}>Try the other path <span aria-hidden="true">→</span></button>
      </div>}
    </>}
    <p className="entry-status" role="status" aria-live="polite">{notice || (started ? 'The recorded state follows the selected rule.' : 'No response has been recorded.')}</p>
  </section>;
}

function situationForIntermission(situation: Situation) { return { ...situation, description: 'The selected action has been applied to the current run.' }; }

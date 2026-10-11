import { Branch, BranchId, INITIAL, SimEvent } from '../simulation/engine';

interface Props {
  branches: Branch[];
  activeId: BranchId;
  activeEvents: SimEvent[];
  busy: boolean;
  highlightedIds: string[];
  currentDays: number;
  selectedEvent: SimEvent | null;
  onSelectEvent: (event: SimEvent | null) => void;
}

const dayX = (remaining: number) => 184 + Math.max(0, Math.min(7, INITIAL.days - remaining)) * 72;

export function TimelineView({ branches, activeId, activeEvents, busy, highlightedIds, currentDays, selectedEvent, onSelectEvent }: Props) {
  const branchA = branches.find(branch => branch.id === 'A');
  const branchB = branches.find(branch => branch.id === 'B');
  const drawBranch = (branch: Branch | undefined, id: BranchId) => {
    const y = id === 'A' ? 98 : 202;
    const active = branch?.id === activeId;
    const events = active ? activeEvents : branch?.events || [];
    const latest = active ? currentDays : branch?.state.days ?? INITIAL.days;
    const endX = branch ? events.length ? dayX(latest) + 18 + (events.length - 1) * 12 : dayX(latest) : 740;
    return <g key={id} className={`timeline-path path-${id.toLowerCase()} ${active ? 'is-active' : ''}`}>
      {branch && <path className={`path-rule ${busy && active ? 'is-drawing' : ''}`} pathLength="1" d={`M184 ${y} H${Math.max(184, endX)}`}/>}
      <text className="path-label" x="184" y={y - 18}>PATH {id}{branch ? ` · ${branch.decision.toUpperCase()}` : ' · NOT RECORDED'}</text>
      {branch && events.map(event => {
        const allIndex = branch.events.findIndex(item => item.id === event.id);
        const snapshot = branch.history[Math.min(allIndex + 1, branch.history.length - 1)];
        const sameDayOffset = allIndex * 11;
        const x = Math.min(738, dayX(snapshot?.state.days ?? branch.state.days) + 18 + sameDayOffset);
        const isHighlighted = highlightedIds.includes(event.id);
        return <g key={event.id} className={`chart-event ${id === 'B' ? 'marker-square' : ''} ${isHighlighted ? 'is-highlighted' : ''} ${selectedEvent?.id === event.id ? 'is-selected' : ''}`} role="button" tabIndex={0} aria-label={`${event.title}, Path ${id}, ${snapshot?.state.days ?? branch.state.days} days remaining`} onClick={() => onSelectEvent(event)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectEvent(event); } }}>
          {id === 'B' ? <rect x={x - 5} y={y - 5} width="10" height="10"/> : <circle cx={x} cy={y} r="5"/>}
          <text className="chart-event-title" x={x} y={y + 20} textAnchor="middle">{event.title}</text>
          <text className="chart-event-day" x={x} y={y + 34} textAnchor="middle">{snapshot?.state.days ?? branch.state.days} DAYS LEFT</text>
        </g>;
      })}
    </g>;
  };
  const markerX = dayX(currentDays);
  return <section className="timeline-view" aria-labelledby="timeline-heading">
    <div className="section-overline"><span className="data-label">FIGURE 01</span><span className="data-label">DAYS REMAINING → 0</span></div>
    <h2 id="timeline-heading">Two routes from the same withdrawal</h2>
    <p className="timeline-deck">The paths share one starting state. Markers follow each recorded event and the days remaining in its snapshot.</p>
    <div className="timeline-canvas">
      <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Timeline chart showing the sponsor withdrawal, day marks, and recorded paths A and B">
        <line className="chart-origin-rule" x1="72" y1="151" x2="184" y2="151"/>
        <circle className="withdrawal-marker" cx="72" cy="151" r="4"/>
        <text className="withdrawal-label" x="72" y="177" textAnchor="middle">DAY 2</text>
        <text className="withdrawal-copy" x="72" y="191" textAnchor="middle">WITHDRAWAL</text>
        <line className="fork-rule" x1="184" y1="98" x2="184" y2="202"/>
        <circle className="fork-marker" cx="184" cy="151" r="4"/>
        <line className="current-position" x1={markerX} y1="64" x2={markerX} y2="253"/>
        <text className="current-position-label" x={Math.min(725, markerX + 6)} y="59">CURRENT · {currentDays}D</text>
        {drawBranch(branchA, 'A')}{drawBranch(branchB, 'B')}
        {Array.from({ length: 8 }, (_, index) => {
          const x = 184 + index * 72;
          const remaining = 7 - index;
          return <g key={remaining} className="day-tick"><line x1={x} y1="268" x2={x} y2="278"/><text x={x} y="296" textAnchor="middle">{remaining === 0 ? 'OPEN' : `${remaining}D`}</text></g>;
        })}
        <line className="day-axis" x1="184" y1="268" x2="688" y2="268"/>
      </svg>
    </div>
    {selectedEvent && <div className="timeline-caption"><span className="data-label">PATH {selectedEvent.branchId} · ENTRY {selectedEvent.step}</span><strong>{selectedEvent.title}</strong><p>{selectedEvent.description}</p><small>{selectedEvent.rule}</small><button onClick={() => onSelectEvent(null)}>Close note</button></div>}
    <div className="path-key"><span><i className="key-line key-a"/>Path A · solid rule / round markers</span><span><i className="key-line key-b"/>Path B · broken rule / square markers</span></div>
  </section>;
}

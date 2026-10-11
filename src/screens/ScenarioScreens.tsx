import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { AnimatePresence, animate as animateMotion, motion, useMotionValue, useTransform } from 'framer-motion';
import type { Scenario } from '../scenarios/schema';
import type { Run } from '../engine/engine';
import { formatMeasure, optionsFor } from '../engine/engine';
import { ScenarioIllustration } from '../illustrations';
import { motionEasings, motionTokens, scenarioLayoutId, skipCurrentAnimation } from '../motion';
import { describeOptionPreview, type PreviewDescriptor } from '../interaction/preview';
import { claimDecisionCommit, isPointInsideDropTarget, queryWorldDropTarget, setWorldDropTargetActive } from '../interaction/decision-drop';
import type { MissionConfig, ScoreResult, ToolCharges } from '../game/types';
import type { AdvisorName } from '../game/tools';
import { DECISION_CLOCK_SECONDS, firstValidClockChoice, startDecisionClock } from '../game/clock';
import { advisorFor } from '../game/tools';
import { GameMissionHUD, MissionBrief } from '../game/GamePanels';
import { chainCount } from '../effects/chain';

export function IntroScreen({ scenario, onBegin, onContinue, hasSaved, mission, daily, onHowToPlay }: { scenario: Scenario; onBegin: () => void; onContinue: () => void; hasSaved: boolean; mission?: MissionConfig; daily?:{date:string;modifier:{label:string}}|null; onHowToPlay?:()=>void }) {
  return <motion.section layoutId={scenarioLayoutId(scenario.id)} transition={{ layout: { duration: motionTokens.duration.large, ease: 'easeOut' } }} className="lib-screen intro-lib">
    <div className="intro-copy-block" data-surface="light">
      <p className="eyebrow">{scenario.difficulty} situation</p>
      <h1>{scenario.title}</h1>
      <p className="intro-deck">{scenario.intro.summary}</p>
      <p className="intro-objective">{scenario.intro.objective}</p>
      {mission&&<MissionBrief scenario={scenario} mission={mission} daily={daily}/>}
      <div className="initial-measures" aria-label="Starting conditions">{scenario.measures.map(m => <div key={m.key}><small>{m.label}</small><strong>{formatMeasure(scenario, m.key, scenario.startingState[m.key])}</strong></div>)}</div>
      <div className="intro-actions">{hasSaved && <button className="text-button" onClick={onContinue}>Continue saved run</button>}<button className="primary-button" onClick={onBegin}>{hasSaved ? 'Start a new run' : 'Begin'}</button>{onHowToPlay&&<button className="text-button" onClick={onHowToPlay}>How to play</button>}</div>
    </div>
    <ScenarioIllustration scenario={scenario} state={scenario.startingState} />
  </motion.section>;
}

export function DecisionScreen({ scenario, run, onChoose, onPreviewChange, game }: { scenario: Scenario; run: Run; onChoose: (id: string) => void; onPreviewChange?: (preview: PreviewDescriptor | null) => void; game?:{mission:MissionConfig;score:ScoreResult;charges:ToolCharges;foresightActive:boolean;daily:boolean;clockEnabled:boolean;soundEnabled:boolean;canRewind:boolean;onForesight:()=>void;onRewind:()=>void;onClockToggle:(enabled:boolean)=>void;onSoundToggle:()=>void;onAdvisorReveal:(name:AdvisorName)=>ReturnType<typeof advisorFor>|null} }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const dropActiveRef = useRef(false);
  const [dropMessage, setDropMessage] = useState('Drag onto the stage or select an option.');
  const [advisorOpen,setAdvisorOpen]=useState(false);
  const [advisorName,setAdvisorName]=useState<AdvisorName>('The Steward');
  const [advisorResult,setAdvisorResult]=useState<ReturnType<typeof advisorFor>|null>(null);
  const [clockRemaining,setClockRemaining]=useState(DECISION_CLOCK_SECONDS);
  const previewTimer = useRef<number | undefined>(undefined);
  const commitTimer = useRef<number | undefined>(undefined);
  const commitRef = useRef(false);
  const drag = useRef<{ id: string; pointerId: number; startX: number; startY: number; element: HTMLButtonElement; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const options = optionsFor(scenario, run);
  const onChooseRef=useRef(onChoose);onChooseRef.current=onChoose;
  const situation = run.events[run.events.length - 1];
  const previewOption = options.find(option => option.id === previewId);
  const preview = previewOption ? describeOptionPreview(scenario, previewOption) : null;
  useEffect(() => { setSelected(null); setPreviewId(null); setDropActive(false); dropActiveRef.current=false;setWorldDropTargetActive(false);commitRef.current = false; onPreviewChange?.(null); }, [run.events.length, onPreviewChange]);
  useEffect(() => () => { window.clearTimeout(previewTimer.current); window.clearTimeout(commitTimer.current);setWorldDropTargetActive(false);onPreviewChange?.(null); }, [onPreviewChange]);
  const schedulePreview = (id: string) => {
    window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => { setPreviewId(id); const option = options.find(item => item.id === id); onPreviewChange?.(option ? describeOptionPreview(scenario, option) : null); }, 130);
  };
  const clearPreview = () => { window.clearTimeout(previewTimer.current); setPreviewId(null); onPreviewChange?.(null); };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < options.length && !selected && claimDecisionCommit(commitRef)) {
        clearPreview();
        setSelected(options[index].id);
        commitTimer.current = window.setTimeout(() => onChoose(options[index].id), motionTokens.duration.option * 1000);
      }
      if(game&&e.key.toLowerCase()==='f'&&game.charges.foresight>0)game.onForesight();
      if(game&&e.key.toLowerCase()==='r'&&game.canRewind)game.onRewind();
      if(game&&e.key.toLowerCase()==='a')setAdvisorOpen(value=>!value);
      if(game&&e.key.toLowerCase()==='m')game.onSoundToggle();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [options, selected, onChoose, game]);
  const optionSignature=options.map(option=>option.id).join('|');
  useEffect(()=>{
    if(!game?.clockEnabled||game.daily||!options.length)return;
    const clock=startDecisionClock({onTick:setClockRemaining,isPaused:()=>document.hidden,isCommitted:()=>commitRef.current,onExpire:()=>{const choice=firstValidClockChoice(options.map(option=>option.id),commitRef.current);if(choice&&claimDecisionCommit(commitRef)){clearPreview();setSelected(choice);onChooseRef.current(choice);}}});
    const resetBaseline=()=>clock.refreshBaseline();document.addEventListener('visibilitychange',resetBaseline);
    return()=>{clock.stop();document.removeEventListener('visibilitychange',resetBaseline)};
  },[game?.clockEnabled,game?.daily,optionSignature]);
  const choose = (id: string, event?: MouseEvent<HTMLButtonElement> | ReactPointerEvent<HTMLButtonElement>) => {
    if (selected || !claimDecisionCommit(commitRef)) return;
    clearPreview();
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.closest('.decision-lib')?.setAttribute('style', `--ripple-x:${event.clientX - rect.left}px;--ripple-y:${event.clientY - rect.top + event.currentTarget.offsetTop}px`);
    }
    setSelected(id);
    setDropMessage('Decision selected.');
    commitTimer.current = window.setTimeout(() => onChoose(id), motionTokens.duration.option * 1000);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX; const dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) > 7) current.moved = true;
    if (current.moved) {
      current.element.style.translate = `${dx}px ${dy}px`;
      const target = current.element.closest('.decision-lib')?.querySelector('.decision-drop-target');
      const point={x:event.clientX,y:event.clientY};
      const worldTarget=queryWorldDropTarget(point);
      if(worldTarget!==null){
        if(dropActiveRef.current!==worldTarget){dropActiveRef.current=worldTarget;setDropActive(worldTarget);setWorldDropTargetActive(worldTarget);}
      }else if (target) {
        const rect = target.getBoundingClientRect();
        const active = isPointInsideDropTarget(point, rect);
        if (dropActiveRef.current !== active) { dropActiveRef.current = active; setDropActive(active);setWorldDropTargetActive(active); }
      }
    }
  };
  const pointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    current.element.style.translate = '';
    dropActiveRef.current = false;
    setDropActive(false);setWorldDropTargetActive(false);
    if (current.moved) {
      suppressClick.current = true;
      const target = current.element.closest('.decision-lib')?.querySelector('.decision-drop-target');
      const rect = target?.getBoundingClientRect();
      const point={x:event.clientX,y:event.clientY};
      const worldTarget=queryWorldDropTarget(point);
      const valid = worldTarget??isPointInsideDropTarget(point, rect);
      if (valid) choose(current.id, event);
      else { clearPreview(); setDropMessage('Place the token on the stage, or select it directly.'); }
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    }
    if (current.element.hasPointerCapture(event.pointerId)) current.element.releasePointerCapture(event.pointerId);
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current.element.style.translate = '';
    drag.current = null; dropActiveRef.current = false; setDropActive(false);setWorldDropTargetActive(false);clearPreview(); setDropMessage('Decision drag cancelled. Select an option or try again.');
  };
  return <section className={`lib-screen decision-lib ${selected ? 'has-selection' : ''}`}>
    <div className="decision-copy" data-surface="light">
      <p className="eyebrow">Entry {String(run.events.length + 1).padStart(2, '0')} · Day {String(run.day).padStart(2, '0')} · Decision {run.decisions.length + 1} of {scenario.steps}</p>
      <h1>{situation?.title}</h1>
      <p className="decision-description">{situation?.description}</p>
      <p className="decision-why">{situation?.why}</p>
      {game&&<GameMissionHUD scenario={scenario} mission={game.mission} state={run.state} score={game.score} charges={game.charges}>
        <div className="game-control-row">
          <button className="game-tool-action" onClick={game.onForesight} disabled={game.charges.foresight<=0} aria-keyshortcuts="F">Use Foresight · {game.charges.foresight}</button>
          <button className="game-tool-action" onClick={game.onRewind} disabled={!game.canRewind||game.charges.rewind<=0} aria-keyshortcuts="R">Rewind · {game.charges.rewind}</button>
          <button className="game-tool-action" onClick={()=>setAdvisorOpen(open=>!open)} aria-expanded={advisorOpen} aria-keyshortcuts="A">Advisor · {game.charges.advisor}</button>
          <button className="game-tool-action" onClick={game.onSoundToggle} aria-pressed={game.soundEnabled} aria-keyshortcuts="M">Sound {game.soundEnabled?'on':'off'}</button>
          {!game.daily&&<label className="clock-toggle"><input type="checkbox" checked={game.clockEnabled} onChange={e=>game.onClockToggle(e.target.checked)}/> Decision clock · 20 seconds; timeout selects the first available option</label>}
          {game.clockEnabled&&!game.daily&&<span className="clock-remaining" role="timer" aria-label={`${clockRemaining} seconds remaining`}>{clockRemaining}s</span>}
        </div>
        {game.foresightActive&&<p className="foresight-note" aria-live="polite">Foresight: directions come from listed effects; threshold events may change the final result.</p>}
        {advisorOpen&&<div className="advisor-panel"><label>Advisor<select value={advisorName} onChange={e=>setAdvisorName(e.target.value as AdvisorName)}><option>The Steward</option><option>The Visionary</option><option>The Treasurer</option></select></label><small>{advisorName==='The Steward'?'Cautious':advisorName==='The Visionary'?'Ambitious':'Thrifty'} bias. Revealing advice uses one charge; opening this panel does not.</small><button className="text-button" disabled={game.charges.advisor<=0} onClick={()=>{const result=game.onAdvisorReveal(advisorName);if(result)setAdvisorResult(result)}}>Reveal advice</button>{advisorResult&&<p role="status"><strong>{advisorResult.advisor} · {advisorResult.bias}</strong>{advisorResult.optionTitle?` prefers “${advisorResult.optionTitle}.” `:' '}{advisorResult.reasoning}</p>}</div>}
      </GameMissionHUD>}
      <div className="decision-mobile-art"><ScenarioIllustration scenario={scenario} state={run.state} /></div>
      <div className="lib-options" onMouseLeave={() => { if (!(document.activeElement instanceof HTMLElement && document.activeElement.closest('.lib-options'))) clearPreview(); }}>{options.map((option, i) => <motion.button key={option.id} aria-keyshortcuts={`${i + 1}`} className={`lib-option ${selected === option.id ? 'chosen' : ''} ${selected && selected !== option.id ? 'unchosen' : ''} ${drag.current?.id === option.id ? 'is-dragging' : ''}`} disabled={!!selected} onPointerEnter={() => schedulePreview(option.id)} onFocus={() => schedulePreview(option.id)} onBlur={() => clearPreview()} onPointerDown={e => { if (e.button !== 0 && e.pointerType === 'mouse') return; schedulePreview(option.id); drag.current = { id: option.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, element: e.currentTarget, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onClick={e => { if (suppressClick.current) { e.preventDefault(); return; } choose(option.id, e); }} whileTap={{ scale: 0.98 }} transition={{ duration: motionTokens.duration.micro, ease: motionEasings.framerEntrance }}>
        <span className="option-key">0{i + 1}</span><span><b>{option.title}</b><small>{option.detail}</small>{game?.foresightActive&&<small className="foresight-option">{describeOptionPreview(scenario,option).description}</small>}</span>
      </motion.button>)}</div>
      <p className="option-preview" aria-live="polite">{preview?.description || dropMessage}</p>
      <p className="decision-hint">Drag a decision token onto the stage or select it · keys 1–{options.length}</p>
    </div>
    <div className={`decision-hero ${dropActive ? 'drop-is-active' : ''}`}>
      <ScenarioIllustration scenario={scenario} state={run.state} />
      <div className="decision-drop-target" aria-hidden="true"><span>{dropActive ? 'Release to commit' : 'Drop decision here'}</span></div>
      <AnimatePresence>{preview && <motion.div className="decision-ghost-preview" aria-hidden="true" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: motionTokens.duration.small, ease: motionEasings.framerEntrance }}><span className="ghost-forms">{preview.roles.map(role => <i className={`ghost-form ghost-${role}`} key={role}/>)}</span><small>Possible direction</small></motion.div>}</AnimatePresence>
    </div>
  </section>;
}

function CountedMeasure({ scenario, measure, from, value, visible, reduced }: { scenario: Scenario; measure: Scenario['measures'][number]; from: number; value: number; visible: boolean; reduced: boolean }) {
  const current = useMotionValue(visible && reduced ? value : from);
  useEffect(() => {
    if (!visible) return;
    if (reduced) { current.set(value); return; }
    current.set(from);
    const control = animateMotion(current, value, { duration: motionTokens.consequence.counter, ease: [0.22, 1, 0.36, 1] });
    return () => control.stop();
  }, [current, from, value, visible, reduced]);
  const formatted = useTransform(current, n => formatMeasure(scenario, measure.key, Math.round(n * 10) / 10));
  return <motion.strong>{formatted}</motion.strong>;
}

export function ConsequenceScreen({ scenario, run, onContinue, onMetricReveal, skip, reduced, stinger, onDismissStinger }: { scenario: Scenario; run: Run; onContinue: () => void; onMetricReveal?: () => void; skip: boolean; reduced: boolean; stinger?:string; onDismissStinger?:()=>void }) {
  const [stage, setStage] = useState(-1);
  const [done, setDone] = useState(false);
  const event = run.events[run.events.length - 1];
  const chain=event?chainCount(scenario,run,event.step):0;
  const before = run.history[Math.max(0, run.history.length - 2)].state;
  const measures = useMemo(() => {
    const priority = ['resources', 'time', 'people', 'progress'];
    return [...scenario.measures].sort((a, b) => priority.indexOf(a.role) - priority.indexOf(b.role));
  }, [scenario]);
  useEffect(() => {
    setStage(reduced ? measures.length - 1 : -1);
    setDone(reduced);
    if (reduced) return;
    const timer = window.setInterval(() => setStage(current => {
      if (current >= measures.length - 1) { window.clearInterval(timer); setDone(true); return measures.length - 1; }
      return current + 1;
    }), 350);
    return () => window.clearInterval(timer);
  }, [event?.id, reduced, measures.length]);
  useEffect(() => { if (skip) { setStage(measures.length - 1); setDone(true); } }, [skip, measures.length]);
  useEffect(() => {
    const measure = measures[stage];
    const changed = measure && run.state[measure.key] !== before[measure.key];
    window.dispatchEvent(new CustomEvent('echoes:measure-focus', { detail: { role: changed ? measure.role : null } }));
  }, [before, measures, run.state, stage]);
  useEffect(() => {
    const measure = measures[stage];
    if (!reduced && !skip && measure && run.state[measure.key] !== before[measure.key]) onMetricReveal?.();
  }, [before, measures, onMetricReveal, reduced, run.state, skip, stage]);
  const revealAll = () => { if (!done) { setStage(measures.length - 1); setDone(true); } };
  return <section className="lib-screen consequence-lib" onClick={revealAll}>
    <ScenarioIllustration scenario={scenario} state={run.state} active={!reduced} eventTick={run.decisions.length} />
    <div className="consequence-main">
      <p className="eyebrow">Consequences recorded · Day {String(run.day).padStart(2, '0')}</p>
      <h1>{event?.title}</h1>
      <p className="consequence-summary">{event?.description}</p>
      {chain>=2&&<p className="consequence-chain" role="status">Chain · {chain} distinct measures improved</p>}
      {stinger&&<motion.button type="button" className="event-stinger" aria-label={`Dismiss event note: ${stinger}`} initial={reduced?false:{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:reduced?.01:.22,ease:motionEasings.framerEntrance}} onClick={onDismissStinger}>Follow-on event · {stinger}</motion.button>}
      <div className="measure-reveals" aria-live="polite">{measures.map((measure, i) => {
        const delta = run.state[measure.key] - before[measure.key];
        const visible = skip || reduced || i <= stage;
        const improved = measure.higherIsBetter ? delta > 0 : delta < 0;
        return <motion.div className={`measure-reveal ${visible ? 'is-revealed' : ''}`} key={measure.key} initial={false} animate={{ opacity: visible ? 1 : 0.24, y: visible ? 0 : 8 }} transition={{ duration: reduced || skip ? 0.01 : motionTokens.duration.medium, delay: reduced || skip ? 0 : i * motionTokens.stagger.sibling }} aria-label={`${measure.label}: ${formatMeasure(scenario, measure.key, run.state[measure.key])}`}>
          <small>{measure.label}</small><CountedMeasure scenario={scenario} measure={measure} from={before[measure.key]} value={run.state[measure.key]} visible={visible} reduced={reduced || skip} />
          <span className={delta === 0 ? 'no-delta' : improved ? 'positive-delta' : 'negative-delta'}>{delta === 0 ? '— No change' : `${improved ? '▲' : '▼'} ${delta > 0 ? '+' : '−'}${formatMeasure(scenario, measure.key, Math.abs(delta))}`}</span>
        </motion.div>;
      })}</div>
      <p className={`cause-copy ${done ? 'shown' : ''}`}>{event?.why}</p>
      <button className="primary-button" disabled={!done} onClick={e => { e.stopPropagation(); skipCurrentAnimation(); onContinue(); }}>Continue</button>
      {!done && <p className="decision-hint">Click or press Space to reveal the rest</p>}
    </div>
  </section>;
}

export function ResultScreen({ scenario, run, onAlt, onCompare, onTree, gameSummary, onRewind }: { scenario: Scenario; run: Run; onAlt: () => void; onCompare: () => void; onTree: () => void; gameSummary?:ReactNode; onRewind?:()=>void }) {
  const measure = scenario.measures.find(item => item.role === 'progress') || scenario.measures[scenario.measures.length - 1];
  const [low, high] = measure.domain;
  const values = run.history.map(history => history.state[measure.key]);
  const points = values.map((value, i) => {
    const ratio = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return `${25 + i * 350 / Math.max(1, values.length - 1)},${145 - ratio * 110}`;
  }).join(' ');
  const label = scenario.outcomes.find(outcome => outcome.id === run.outcome)?.label;
  return <section className="lib-screen result-lib">
    <div className="result-copy-block">
      <p className="eyebrow">Path {run.id} · Final entry</p><h1>{label}</h1>
      <p className="result-summary">{scenario.events.find(item => item.id === 'ending')?.description}</p>
      <div className="result-measures">{scenario.measures.map(item => <div key={item.key}><small>{item.label}</small><strong>{formatMeasure(scenario, item.key, run.state[item.key])}</strong></div>)}</div>
      <svg className="result-chart" viewBox="0 0 400 180" role="img" aria-label={`${measure.label} recorded through this run`}><line x1="25" y1="150" x2="375" y2="150"/><polyline points={points} pathLength="1"/><text x="25" y="172">START</text><text x="375" y="172" textAnchor="end">FINAL</text></svg>
      <p className="decision-history">{run.decisions.map(id => scenario.options.find(option => option.id === id)?.title).join(' · ')}</p>
      {gameSummary}
      {onRewind&&<button className="text-button result-rewind" onClick={onRewind}>Use Rewind to undo the final decision</button>}
      <div className="intro-actions"><button className="primary-button" onClick={onAlt}>Try the other path</button>{run.id === 'B' && <button className="text-button" onClick={onCompare}>Compare paths</button>}<button className="text-button" onClick={onTree}>Explore decision history</button></div>
    </div>
    <ScenarioIllustration scenario={scenario} state={run.state} active />
  </section>;
}

export function CompareScreen({ scenario, a, b, onWhy, onPath }: { scenario: Scenario; a: Run; b: Run; onWhy: () => void; onPath: (id: 'A' | 'B') => void }) {
  const diff = scenario.measures.map(measure => ({ measure, a: a.state[measure.key], b: b.state[measure.key], delta: b.state[measure.key] - a.state[measure.key] }));
  const resource = diff.find(item => item.measure.role === 'resources')!;
  const progress = diff.find(item => item.measure.role === 'progress')!;
  const summary = [
    resource.delta === 0 ? `${resource.measure.label} finishes level.` : `Path ${resource.delta > 0 ? 'B' : 'A'} retains more ${resource.measure.label.toLowerCase()}.`,
    progress.delta === 0 ? `${progress.measure.label} finishes level.` : `Path ${progress.delta > 0 ? 'B' : 'A'} reaches higher ${progress.measure.label.toLowerCase()}.`,
  ].join(' ');
  return <section className="lib-screen compare-lib">
    <p className="eyebrow">Two recorded futures · {scenario.title}</p><h1>Compare outcomes</h1>
    <div className="compare-static-scenes"><figure><ScenarioIllustration scenario={scenario} state={a.state}/><figcaption>Path A · Solid</figcaption></figure><figure><ScenarioIllustration scenario={scenario} state={b.state}/><figcaption>Path B · Dashed</figcaption></figure></div>
    <div className="compare-table"><div className="compare-head"><span>Path A · Solid</span><span>Difference</span><span>Path B · Dashed</span></div>{diff.map(({ measure, a: valueA, b: valueB, delta }) => <div className="compare-line" key={measure.key}><span>{formatMeasure(scenario, measure.key, valueA)}</span><small>{measure.label} · {delta > 0 ? '+' : ''}{formatMeasure(scenario, measure.key, delta)}</small><span>{formatMeasure(scenario, measure.key, valueB)}</span></div>)}</div>
    <p className="compare-verdict">Path A: {scenario.outcomes.find(outcome => outcome.id === a.outcome)?.label}. Path B: {scenario.outcomes.find(outcome => outcome.id === b.outcome)?.label}. {summary}</p>
    <div className="intro-actions"><button className="text-button" onClick={() => onPath('A')}>Review Path A</button><button className="text-button" onClick={() => onPath('B')}>Review Path B</button><button className="primary-button" onClick={onWhy}>Why did this happen?</button></div>
  </section>;
}

export function WhyOverlay({ scenario, a, b, active, onClose }: { scenario: Scenario; a: Run; b: Run; active: Run; onClose: () => void }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return <motion.div className="why-overlay" role="dialog" aria-modal="true" aria-label="Why did this happen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionTokens.duration.small }}>
    <section className="why-content">
      <button className="why-close" aria-label="Close explanation" onClick={onClose}>Close</button>
      <div className="why-hero"><ScenarioIllustration scenario={scenario} state={active.state} /></div>
      <p className="eyebrow">Rule record</p><h1>Why did this happen?</h1>
      <div className="why-paths">{[a, b].map(run => <article key={run.id}><h2>Path {run.id} · {scenario.outcomes.find(outcome => outcome.id === run.outcome)?.label}</h2>
        <div className="why-metric-list">{scenario.measures.map(measure => {
          const changes = run.events.flatMap(entry => entry.changes.filter(change => change.measure === measure.key));
          const delta = run.state[measure.key] - scenario.startingState[measure.key];
          return <div key={measure.key}><b>{measure.label}</b><span>{delta > 0 ? '+' : ''}{formatMeasure(scenario, measure.key, delta)}</span><small>{changes.length} recorded effects · final {formatMeasure(scenario, measure.key, run.state[measure.key])}</small></div>;
        })}</div>
        <p className="why-event-sequence">{run.events.filter(entry => entry.changes.length || entry.optionId).map(entry => entry.title).filter((title, i, all) => all.indexOf(title) === i).join(' → ')}</p>
        <details><summary>Inspect every recorded rule effect</summary>{run.events.flatMap(entry => entry.changes.map((change, i) => <p key={`${entry.id}-${i}`}><b>{scenario.measures.find(measure => measure.key === change.measure)?.label}</b> {change.delta > 0 ? '+' : ''}{formatMeasure(scenario, change.measure, change.delta)} — {change.reason}<small>{entry.title}</small></p>))}</details>
      </article>)}</div>
      <button className="primary-button" onClick={onClose}>Close explanation</button>
    </section>
  </motion.div>;
}

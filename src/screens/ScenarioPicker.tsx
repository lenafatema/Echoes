import { motion } from 'framer-motion';
import { scenarios } from '../scenarios';
import type { Scenario } from '../scenarios/schema';
import { ScenarioIllustration } from '../illustrations';
import { motionTokens, scenarioLayoutId } from '../motion';
import { isScenarioUnlocked, campaignStars, achievementDefinitions, type RunRecord, type AchievementRecord } from '../game';
import type { StudioSituation } from '../studio/types';
import { playable } from '../studio/draft-store';

type PickerView = 'choices' | 'library';
type Props = {
  onSelect: (s: Scenario) => void;
  completed: string[];
  selectedId: string | null;
  onFocusScenario?: (id: string | null) => void;
  bestStars?: Record<string, number>;
  freePlay?: boolean;
  onFreePlayChange?: (value: boolean) => void;
  onDailyChallenge?: () => void;
  history?: RunRecord[];
  achievements?: AchievementRecord[];
  onReplayRecord?: (record: RunRecord) => void;
  onLocked?: () => void;
  studioItems?: StudioSituation[];
  onStudioCreate?: () => void;
  onStudioOpen?: () => void;
  onStudioEdit?: (s: Scenario) => void;
  onStudioEditItem?: (s: StudioSituation) => void;
  onStudioPlay?: (s: StudioSituation) => void;
  onStudioDelete?: (id: string) => void;
  plannerXp?: number;
  plannerLevel?: number;
  renderMode?: 'world' | 'lite' | 'static';
  view?: PickerView;
  onViewChange?: (view: PickerView) => void;
};

function DraftingMark() {
  return <svg aria-hidden="true" viewBox="0 0 64 56"><path d="M7 42 43 7l14 14-36 35H7z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m34 16 14 14M22 29l14 14M12 39h9M41 10l4-4 14 14-4 4" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M13 46h8M24 35l8 8M32 27l8 8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".72"/></svg>;
}

function LockMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4.5" y="10" width="15" height="11" rx="1"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>;
}

export function ScenarioPicker({
  onSelect, completed, selectedId, onFocusScenario, bestStars = {}, freePlay = false,
  onFreePlayChange, onDailyChallenge, history = [], achievements = [], onReplayRecord,
  onLocked, studioItems = [], onStudioCreate, onStudioOpen, onStudioEdit,
  onStudioEditItem, onStudioPlay, onStudioDelete, plannerXp = 0, plannerLevel = 1,
  view = 'choices', onViewChange, renderMode = 'world',
}: Props) {
  const campaignProgress = <p className="campaign-progress">Campaign stars <strong>{campaignStars(bestStars)} / 18</strong><span className="planner-progress">Planner level {plannerLevel} · {plannerXp} XP</span></p>;

  if (view === 'choices') {
    return <section className="library-picker picker-home" aria-labelledby="picker-title">
      <div className="picker-home-world" aria-hidden="true">
        {renderMode === 'static' && <div className="picker-home-static-scene"><ScenarioIllustration scenario={scenarios[0]} state={scenarios[0].startingState} active /></div>}
        <span className="picker-home-world-caption">Planning Room</span>
      </div>
      <header className="library-picker-head picker-home-head">
        <div className="picker-intro">
          <p className="eyebrow">ECHOES · Planning room</p>
          <h1 id="picker-title">Choose what to do</h1>
          <p>Build a situation of your own, or choose a prepared scenario.</p>
        </div>
      </header>
      <div className="picker-entry-choices" aria-label="Choose how to begin">
        <button type="button" className="scenario-create-feature" onClick={onStudioCreate} disabled={!onStudioCreate} aria-label="Create a scenario. Build your own decision scenario." aria-describedby="scenario-create-description">
          <DraftingMark />
          <span className="create-feature-copy"><small>SCENARIO STUDIO</small><strong>Create a scenario</strong><span id="scenario-create-description">Build and play a situation of your own.</span><b>Create scenario <span aria-hidden="true">→</span></b></span>
        </button>
        <button type="button" className="scenario-browse-feature" onClick={() => onViewChange?.('library')} aria-label="Choose from existing scenarios">
          <span className="browse-feature-art" aria-hidden="true"><span>01</span><span>02</span><span>03</span></span>
          <span className="create-feature-copy"><small>SCENARIO LIBRARY</small><strong>Choose from existing scenarios</strong><span>Explore six prepared situations and your campaign progress.</span><b>Browse scenarios <span aria-hidden="true">→</span></b></span>
        </button>
      </div>
    </section>;
  }

  return <section className="library-picker picker-existing" aria-labelledby="picker-title">
    <header className="library-picker-head picker-existing-head">
      <div className="picker-intro">
        <p className="eyebrow">ECHOES · Campaign</p>
        <h1 id="picker-title">Existing scenarios</h1>
        <p>Choose a situation. Your progress is saved as you play.</p>
        {campaignProgress}
      </div>
      <div className="picker-actions">
        <button type="button" className="text-button picker-back-button" onClick={() => onViewChange?.('choices')}>← Back</button>
        <button type="button" className="text-button daily-entry" onClick={onDailyChallenge}>Today's challenge</button>
        <label className="free-play-toggle"><input type="checkbox" checked={freePlay} onChange={event => onFreePlayChange?.(event.target.checked)} /><span>Free play</span></label>
        <span className="library-counter">{scenarios.length} situations</span>
      </div>
    </header>

    <div className="scenario-grid">{scenarios.map((scenario, index) => {
      const unlocked = isScenarioUnlocked(index, bestStars, freePlay);
      const unlockText = 'Earn one campaign star in an earlier situation, or enable Free play, to choose this scenario.';
      return <motion.button
        key={scenario.id}
        layoutId={scenarioLayoutId(scenario.id)}
        transition={{ layout: { duration: motionTokens.duration.large, ease: 'easeOut' } }}
        animate={{ opacity: selectedId && selectedId !== scenario.id ? 0 : 1, y: selectedId && selectedId !== scenario.id ? 12 : 0 }}
        className={`scenario-tile ${selectedId === scenario.id ? 'is-expanding' : ''}`}
        onFocus={() => onFocusScenario?.(scenario.id)}
        onBlur={() => onFocusScenario?.(null)}
        onMouseEnter={() => onFocusScenario?.(scenario.id)}
        onMouseLeave={event => { if (!event.currentTarget.matches(':focus')) onFocusScenario?.(null); }}
        onClick={() => { if (!selectedId) { if (unlocked) onSelect(scenario); else { onFocusScenario?.(scenario.id); onLocked?.(); } } }}
        onKeyDown={event => {
          if (['ArrowRight', 'ArrowDown'].includes(event.key)) { event.preventDefault(); (event.currentTarget.parentElement?.children[Math.min(index + 1, 5)] as HTMLElement)?.focus(); }
          if (['ArrowLeft', 'ArrowUp'].includes(event.key)) { event.preventDefault(); (event.currentTarget.parentElement?.children[Math.max(index - 1, 0)] as HTMLElement)?.focus(); }
          if (/^[1-6]$/.test(event.key)) { const target = scenarios[Number(event.key) - 1]; if (target && isScenarioUnlocked(Number(event.key) - 1, bestStars, freePlay)) onSelect(target); }
        }}
        aria-disabled={!unlocked}
        aria-label={`${scenario.title}. ${scenario.contextLine}. ${scenario.difficulty}. ${scenario.options.map(option => option.title).join(', ')}.${unlocked ? '' : ` Unavailable. ${unlockText}`}`}
        title={unlocked ? scenario.title : unlockText}
        aria-keyshortcuts={`${index + 1}`}
      >
        <span className="tile-top"><span>0{index + 1} · {scenario.difficulty}</span>{bestStars[scenario.id] > 0 && <span className="tile-stars" aria-label={`${bestStars[scenario.id]} campaign stars`}>{'★'.repeat(bestStars[scenario.id])}{'☆'.repeat(3 - bestStars[scenario.id])}</span>}{completed.includes(scenario.id) && <span className="completed-mark" aria-label="Completed">Completed</span>}</span>
        <ScenarioIllustration scenario={scenario} state={scenario.startingState} />
        <span className="tile-copy"><strong>{scenario.title}</strong><small>{scenario.contextLine}</small><span className="tile-decisions">{scenario.options.map(option => option.title).join(' · ')}</span></span>
        <span className="tile-inkbar" />
        {!unlocked && <span className="tile-locked"><LockMark /><span>Earn 1 star to unlock</span></span>}
      </motion.button>;
    })}</div>

    <div className="campaign-records">
      <details><summary>My situations · {studioItems.length}</summary><button type="button" className="text-button" onClick={onStudioOpen}>Open Scenario Studio</button><div className="studio-picker-shelf">{studioItems.map(item => <div key={item.id}><span><strong>{item.title}</strong><small>{item.kind === 'edited' ? `Edited · ${item.metadata.baseScenarioId || 'built-in'}` : item.draft ? 'Draft' : item.kind === 'imported' ? 'Imported' : 'Custom'}</small></span><button type="button" className="text-button" onClick={() => onStudioPlay?.(item)} disabled={!playable(item)}>Play</button><button type="button" className="text-button" onClick={() => onStudioEditItem?.(item)}>Edit</button><button type="button" className="text-button" onClick={() => onStudioDelete?.(item.id)}>Delete</button></div>)}</div></details>
      <details><summary>Edit built-in values</summary><div className="studio-picker-shelf">{scenarios.map(item => <div key={item.id}><span><strong>{item.title}</strong><small>Creates a separate edited variant</small></span><button type="button" className="text-button" onClick={() => onStudioEdit?.(item)}>Edit values</button></div>)}</div></details>
      <details><summary>Achievements · {achievements.length} earned</summary><ul>{achievementDefinitions.map(item => { const earned = achievements.find(a => a.id === item.id); return <li key={item.id}><span className={`achievement-badge badge-${item.id}`} role="img" aria-label={`Procedural badge for ${item.title}`}><i /><i /><i /></span><strong>{item.title}</strong> — {item.description}{earned && <small> Earned · {earned.evidence}</small>}</li>; })}</ul></details>
      <details><summary>Run history · {history.length} records</summary>{history.length ? <ol>{history.slice(0, 8).map(record => <li key={record.id}><span>{scenarios.find(item => item.id === record.scenarioId)?.title || record.scenarioId} · {new Date(record.completedAt).toLocaleDateString()} · {record.score} · {record.rank} · {record.stars}★{record.daily ? ' · Daily' : ''}{!record.replayMatches ? ' · Replay mismatch' : ''}</span><small>{record.decisions.map(id => scenarios.find(s => s.id === record.scenarioId)?.options.find(o => o.id === id)?.title || id).join(' → ')} · {record.toolLog.map(entry => entry.tool).join(', ') || 'No tools used'} · {record.bothPathsFinished ? 'Both paths finished' : 'One path finished'}</small><button type="button" className="text-button" onClick={() => onReplayRecord?.(record)}>Replay</button></li>)}</ol> : <p>No completed runs yet.</p>}</details>
    </div>
    <p className="library-foot">Select a situation · use keys 1–6 · drag or scroll to turn the scene</p>
  </section>;
}

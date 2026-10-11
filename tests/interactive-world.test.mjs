import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../src/scenarios/index.ts';
import { applyDecision, newRun, optionsFor } from '../src/engine/engine.ts';
import { describeOptionPreview } from '../src/interaction/preview.ts';
import { branchTreeFor } from '../src/branch-tree/branchTreeAdapter.ts';
import { resolveWorldRenderMode } from '../src/world/render-mode.ts';
import { destinationForLandmark, pickerDetailsIndexForLandmark } from '../src/environment/navigation.ts';
import { rewardFeedbackForCompletion, unpresentedRewardFeedback } from '../src/game/reward-feedback.ts';
import { environmentAccent, resolveScenarioEnvironment } from '../src/world/scenario-environments.ts';
import { tutorialVisibleOnScreen } from '../src/tutorial-visibility.ts';

test('option previews describe directions without evaluating or mutating a run', () => {
  for (const scenario of scenarios) {
    const run = newRun(scenario, 'A');
    const before = structuredClone(run);
    const preview = describeOptionPreview(scenario, scenario.options[0]);
    assert.ok(preview.roles.length > 0, scenario.title);
    assert.match(preview.description, /may/);
    assert.doesNotMatch(preview.description, /\d/);
    assert.deepEqual(run, before, scenario.title);
  }
});

test('branch tree nodes are one-to-one with recorded snapshots on both paths', () => {
  for (const scenario of scenarios) {
    const optionA = scenario.options[0];
    const optionB = scenario.options.find(option => option.id !== optionA.id);
    let a = applyDecision(scenario, newRun(scenario, 'A'), optionA.id);
    let b = applyDecision(scenario, newRun(scenario, 'B'), optionB.id);
    const paths = [{ key: 'branch:A', label: 'Path A', run: a }, { key: 'branch:B', label: 'Path B', run: b }];
    const nodes = branchTreeFor(scenario, paths);
    assert.equal(nodes.length, a.history.length + b.history.length, scenario.title);
    for (const path of paths) {
      const pathNodes = nodes.filter(node => node.runKey === path.key);
      assert.equal(pathNodes.length, path.run.history.length, scenario.title);
      assert.deepEqual(pathNodes[1].state, path.run.history[1].state, scenario.title);
      assert.equal(pathNodes[1].label, scenario.options.find(option => option.id === path.run.decisions[0]).title, scenario.title);
    }
  }
});

test('terminal tree nodes preserve the last decision and its actual outcome', () => {
  for (const scenario of scenarios) {
    let run = newRun(scenario, 'A');
    while (run.status !== 'completed') run = applyDecision(scenario, run, optionsFor(scenario, run)[0].id);
    const terminal = branchTreeFor(scenario, [{ key: 'branch:A', label: 'Path A', run }]).at(-1);
    assert.ok(terminal.label.includes(scenario.options.find(option => option.id === run.decisions.at(-1)).title), scenario.title);
    assert.ok(terminal.label.includes(scenario.outcomes.find(outcome => outcome.id === run.outcome).label), scenario.title);
    assert.deepEqual(terminal.state, run.state, scenario.title);
  }
});

test('render fallback keeps reduced-motion users in the rendered 3D world', () => {
  const base = { forcedStatic:false, worldFailed:false, requestedLite:false, slowWorld:false, lowPower:false, reducedMotion:false };
  assert.equal(resolveWorldRenderMode(base), 'world');
  assert.equal(resolveWorldRenderMode({ ...base, reducedMotion:true }), 'lite');
  assert.equal(resolveWorldRenderMode({ ...base, requestedLite:true }), 'lite');
  assert.equal(resolveWorldRenderMode({ ...base, forcedStatic:true }), 'static');
  assert.equal(resolveWorldRenderMode({ ...base, worldFailed:true }), 'static');
});

test('each Planning Room landmark maps to its existing accessible destination', () => {
  const expected = {
    'campaign-board':'campaign',
    'drawer-cabinet':'my-situations',
    'drafting-desk':'studio',
    'medal-shelf':'achievements',
    ledger:'history',
    radio:'settings',
  };
  for (const [landmark, destination] of Object.entries(expected)) assert.equal(destinationForLandmark(landmark), destination);
  assert.equal(pickerDetailsIndexForLandmark('drawer-cabinet'), 0);
  assert.equal(pickerDetailsIndexForLandmark('medal-shelf'), 2);
  assert.equal(pickerDetailsIndexForLandmark('ledger'), 3);
  assert.equal(pickerDetailsIndexForLandmark('campaign-board'), null);
});

test('guided tutorial prompt only appears on its actionable decision screen', () => {
  assert.equal(tutorialVisibleOnScreen('picker'), false);
  assert.equal(tutorialVisibleOnScreen('intro'), false);
  assert.equal(tutorialVisibleOnScreen('consequence'), false);
  assert.equal(tutorialVisibleOnScreen('decision'), true);
  assert.equal(tutorialVisibleOnScreen('decision', true), false, 'the prompt is hidden while Studio is open');
});

test('each built-in and Studio theme resolves to one stable, distinct world environment', () => {
  const expected = new Map([
    ['college-tech-fest', 'stage'], ['startup-product-launch', 'office'],
    ['restaurant-opening-week', 'kitchen'], ['flood-relief-camp', 'hall'],
    ['film-shoot-weather', 'set'], ['harvest-before-rains', 'field'],
  ]);
  for (const [id, environment] of expected) assert.equal(resolveScenarioEnvironment(id), environment);
  assert.equal(new Set([...expected.values()]).size, 6);
  for (const theme of ['stage','office','kitchen','hall','set','field','workshop','generic']) {
    assert.ok(environmentAccent[resolveScenarioEnvironment('studio-custom', theme)]);
  }
  assert.equal(resolveScenarioEnvironment('unknown-scenario'), 'workshop');
  assert.equal(resolveScenarioEnvironment('studio-custom', 'missing-theme'), 'workshop');
  assert.equal(resolveScenarioEnvironment('college-tech-fest', 'office'), 'stage', 'built-in identity wins over an accidental custom theme');
});

test('physical reward cues are deterministic, derived from new awards, and do not mutate records', () => {
  const record = { id:'completed-run', scenarioId:'college-tech-fest', stars:2, rank:'Gold' };
  const previous = [{ id:'prior', scenarioId:'college-tech-fest', rank:'Silver' }, { id:'prior-gold', scenarioId:'college-tech-fest', rank:'Gold' }];
  const before = structuredClone({ record, previous });
  const cues = rewardFeedbackForCompletion(record, previous, 1, true, ['Steady Hand']);
  assert.deepEqual(cues.map(cue => cue.kind), ['star','achievement','personal-best']);
  assert.deepEqual(cues, rewardFeedbackForCompletion(record, previous, 1, true, ['Steady Hand']));
  assert.deepEqual({ record, previous }, before);
  assert.deepEqual(rewardFeedbackForCompletion(record, previous, 2, false, []), []);
  const seen = new Set();
  const firstPresentation = unpresentedRewardFeedback(seen, cues);
  firstPresentation.forEach(cue => seen.add(cue.id));
  assert.equal(unpresentedRewardFeedback(seen, cues).length, 0, 'visiting the result again must not replay physical rewards');
});

import { claimDecisionCommit, isPointInsideDropTarget, queryWorldDropTarget, registerWorldDropResolver } from '../src/interaction/decision-drop.ts';

test('physical decision drop accepts only the stage bounds and commits at most once', () => {
  const target = { left: 100, top: 200, right: 320, bottom: 420 };
  assert.equal(isPointInsideDropTarget({ x: 101, y: 201 }, target), true);
  assert.equal(isPointInsideDropTarget({ x: 99, y: 201 }, target), false);
  assert.equal(isPointInsideDropTarget({ x: 101, y: 421 }, target), false);
  assert.equal(isPointInsideDropTarget({ x: 50, y: 50 }, null), false);
  const gate = { current: false };
  assert.equal(claimDecisionCommit(gate), true);
  assert.equal(claimDecisionCommit(gate), false);
  gate.current = false;
  assert.equal(claimDecisionCommit(gate), true, 'a restored decision screen can accept the next committed choice');
});

test('a mounted world raycast takes precedence and stale teardown cannot clear a newer target', () => {
  const removeFirst=registerWorldDropResolver(point=>point.x>50);
  assert.equal(queryWorldDropTarget({x:51,y:0}),true);
  assert.equal(queryWorldDropTarget({x:49,y:0}),false);
  const removeSecond=registerWorldDropResolver(point=>point.y<10);
  removeFirst();
  assert.equal(queryWorldDropTarget({x:0,y:9}),true);
  assert.equal(queryWorldDropTarget({x:0,y:11}),false);
  removeSecond();
  assert.equal(queryWorldDropTarget({x:0,y:0}),null,'static fallback is selected when no 3D raycast is mounted');
});

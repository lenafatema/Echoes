import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../src/scenarios/index.ts';
import { applyDecision, newRun, optionsFor } from '../src/engine/engine.ts';
import { presentationEventsFor } from '../src/effects/event-adapter.ts';
import { EffectSequencer } from '../src/effects/effect-sequencer.ts';
import { chainCount } from '../src/effects/chain.ts';
import { bestAndCostliestDecision } from '../src/effects/decision-impact.ts';
import { seededParticles } from '../src/effects/particles.ts';
import { plannerLevel, totalPlannerXp, xpForRecord } from '../src/effects/xp.ts';
import { defaultEffectPreferences, loadEffectPreferences, sanitizeEffectPreferences, saveEffectPreferences, effectiveEffectMode } from '../src/effects/settings.ts';
import { roomLightingFor } from '../src/environment/room-lighting.ts';
import { ambienceFor } from '../src/environment/ambience.ts';
import { roomLandmarks } from '../src/environment/room-layout.ts';
import { configureAudio, playAudioEvent } from '../src/audio/audio-engine.ts';

test('event mapping is repeatable, uses engine events and leaves snapshots untouched', () => {
  for (const scenario of scenarios) {
    const before = newRun(scenario, 'A');
    const after = applyDecision(scenario, before, optionsFor(scenario, before)[0].id);
    const beforeCopy = structuredClone(before), afterCopy = structuredClone(after);
    const a = presentationEventsFor(scenario, before, after, 'stable-run');
    const b = presentationEventsFor(scenario, before, after, 'stable-run');
    assert.deepEqual(a, b, scenario.title);
    assert.ok(a.length > 0, scenario.title);
    assert.ok(a.every(event => event.runId === 'stable-run'), scenario.title);
    assert.deepEqual(before, beforeCopy, scenario.title);
    assert.deepEqual(after, afterCopy, scenario.title);
  }
});

test('effect sequencer delivers each stable event id at most once', () => {
  const scenario = scenarios[0];
  const before = newRun(scenario, 'A');
  const after = applyDecision(scenario, before, optionsFor(scenario, before)[0].id);
  const events = presentationEventsFor(scenario, before, after, 'dedupe-run');
  const sequencer = new EffectSequencer();
  const delivered = [];
  sequencer.subscribe(event => delivered.push(event.id));
  assert.deepEqual(sequencer.publish(events).map(event => event.id), events.map(event => event.id));
  assert.deepEqual(sequencer.publish(events), []);
  assert.deepEqual(delivered, events.map(event => event.id));
});

test('chain calculation respects measure polarity and counts distinct measures only', () => {
  for (const scenario of scenarios) {
    const first = scenario.measures[0], second = scenario.measures[1];
    const helpful = measure => measure.higherIsBetter ? 1 : -1;
    const run = {
      ...newRun(scenario, 'A'),
      events: [{ step: 0, changes: [
        { measure: first.key, delta: helpful(first) },
        { measure: first.key, delta: 0 },
        { measure: second.key, delta: helpful(second) },
      ] }],
    };
    assert.equal(chainCount(scenario, run, 0), 2, scenario.title);
  }
});

test('decision impact ties resolve to the earliest recorded step', () => {
  const scenario = scenarios[0];
  const measure = scenario.measures[0];
  const delta = measure.higherIsBetter ? 1 : -1;
  const run = {
    ...newRun(scenario, 'A'),
    decisions: ['option-one', 'option-two'],
    events: [1, 2].map(step => ({ step, optionId: `option-${step}`, title: `Option ${step}`, changes: [{ measure: measure.key, delta }] })),
  };
  const result = bestAndCostliestDecision(scenario, run);
  assert.equal(result.best?.step, 1);
  assert.equal(result.costliest?.step, 1);
});

test('seeded particle layouts are repeatable and capped at 150', () => {
  assert.deepEqual(seededParticles('run:event', 22), seededParticles('run:event', 22));
  assert.notDeepEqual(seededParticles('run:event-a', 22), seededParticles('run:event-b', 22));
  assert.equal(seededParticles('large', 10000).length, 150);
  assert.equal(seededParticles('negative', -4).length, 0);
});

test('XP, levels and cosmetic thresholds are pure deterministic functions of records', () => {
  const record = { id: 'run-a', stars: 3 };
  const before = structuredClone(record);
  assert.equal(xpForRecord(record), 75);
  assert.equal(totalPlannerXp([record, record], []), 75);
  assert.equal(totalPlannerXp([record], [{ id: 'achievement-a' }, { id: 'achievement-a' }]), 150);
  assert.deepEqual(plannerLevel(100).unlockedCosmetics, ['Walnut table finish']);
  assert.ok(plannerLevel(450).unlockedCosmetics.includes('Walnut table finish'));
  assert.ok(plannerLevel(1000).unlockedCosmetics.includes('Amber lamp tone'));
  assert.deepEqual(record, before);
});

test('effect settings sanitize invalid values and survive unavailable storage', () => {
  const fallback = defaultEffectPreferences(false);
  assert.equal(loadEffectPreferences({ getItem() { throw new Error('storage blocked'); } }, false).mode, fallback.mode);
  const sanitized = sanitizeEffectPreferences({ mode: 'wild', volume: 20, cameraMovement: -1, screenShake: 'yes' });
  assert.equal(sanitized.mode, fallback.mode);
  assert.equal(sanitized.volume, .7);
  assert.equal(sanitized.cameraMovement, 0);
  assert.equal(sanitized.screenShake, false);
  assert.equal(saveEffectPreferences(fallback, { setItem() { throw new Error('quota'); } }), false);
  assert.equal(saveEffectPreferences(fallback, { setItem() {} }), true);
  assert.equal(effectiveEffectMode('full', true, false), 'reduced');
  assert.equal(effectiveEffectMode('full', false, true), 'off');
});

test('effects settings do not alter deterministic simulation outcomes', () => {
  for (const scenario of scenarios) {
    const outcomes = ['full', 'reduced', 'off'].map(mode => {
      effectiveEffectMode(mode, false, false);
      let run = newRun(scenario, 'A');
      while (run.status !== 'completed') run = applyDecision(scenario, run, optionsFor(scenario, run)[0].id);
      return run;
    });
    assert.deepEqual(outcomes[0], outcomes[1], scenario.title);
    assert.deepEqual(outcomes[1], outcomes[2], scenario.title);
  }
});

test('room lighting maps each scenario time domain and ambience stays deterministic', () => {
  for (const scenario of scenarios) {
    const time = scenario.measures.find(measure => measure.role === 'time');
    assert.ok(time, scenario.title);
    const original = structuredClone(scenario.startingState);
    const start = roomLightingFor(scenario, scenario.startingState);
    assert.ok(start.remainingTime >= 0 && start.remainingTime <= 1, scenario.title);
    assert.equal(start.remainingTime, (scenario.startingState[time.key] - time.domain[0]) / (time.domain[1] - time.domain[0]));
    assert.equal(ambienceFor(scenario, .4), ambienceFor(scenario, .4), scenario.title);
    assert.deepEqual(scenario.startingState, original, scenario.title);
  }
  assert.deepEqual(roomLandmarks.map(item => item.id), ['campaign-board','drawer-cabinet','drafting-desk','medal-shelf','ledger','radio']);
  assert.equal(ambienceFor(scenarios.find(s => s.id === 'flood-relief-camp'), .4), 'rain');
});

test('generated audio remains safely inert when a browser AudioContext is unavailable', () => {
  assert.doesNotThrow(() => configureAudio(true, .3, false, false));
  assert.doesNotThrow(() => playAudioEvent('select', true, .2));
});

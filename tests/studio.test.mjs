import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../src/scenarios/index.ts';
import { applyDecision, matchesScenarioRun, newRun, optionsFor } from '../src/engine/engine.ts';
import { checkBalance, medianScore } from '../src/studio/balance-checker.ts';
import { createCustomSituation, createVariant, runSamplePath } from '../src/studio/defaults.ts';
import { deleteSituation, duplicateSituation, playable, replaceSituation, restoreAtIndex } from '../src/studio/draft-store.ts';
import { exportSituation, importSituation, sanitizeScenario } from '../src/studio/import-export.ts';
import { validateScenarioShape, validateSituation } from '../src/studio/schema.ts';
import { loadStudioStorage, saveStudioStorage, emptyStudioState, STUDIO_STORAGE_KEY } from '../src/studio/storage.ts';
import { decodeShare, encodeShare } from '../src/studio/share-link.ts';
import { withScenarioField } from '../src/studio/scenario-field.ts';
import { canAddStudioCriterion, nextStudioCriterion } from '../src/studio/criteria.ts';

const walk = (scenario, visit) => {
  const loop = run => {
    if (run.status === 'completed') { visit(run); return; }
    for (const option of optionsFor(scenario, run)) loop(applyDecision(scenario, run, option.id));
  };
  loop(newRun(scenario));
};

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const fixedDate = new Date('2026-10-11T00:00:00.000Z');

test('Studio mission and mastery additions choose unique measures and thresholds inside each domain', () => {
  const item = createCustomSituation(fixedDate);
  const mission = [...item.metadata.mission];
  const addedMission = nextStudioCriterion(item.scenario, mission, 'mission');
  assert.ok(addedMission);
  assert.ok(!mission.some(criterion => criterion.measure === addedMission.measure));
  const missionMeasure = item.scenario.measures.find(measure => measure.key === addedMission.measure);
  assert.ok(addedMission.min >= missionMeasure.domain[0] && addedMission.min <= missionMeasure.domain[1]);
  assert.equal(canAddStudioCriterion(item.scenario, [...mission, addedMission]), true);
  assert.equal(nextStudioCriterion(item.scenario, item.scenario.measures.map(measure => ({measure:measure.key,min:0,description:'Covered'})), 'mission'), null);

  const downwardScenario = structuredClone(item.scenario);
  downwardScenario.measures.find(measure => measure.key === 'time').higherIsBetter = false;
  const mastery = [...item.metadata.mastery];
  const addedMastery = nextStudioCriterion(downwardScenario, mastery, 'mastery');
  assert.ok(addedMastery);
  assert.ok(addedMastery.max !== undefined);
  assert.equal(validateSituation({...item, metadata:{...item.metadata, mastery:[...mastery, addedMastery]}}).valid, true);
});

test('Studio scenario-prefixed text paths update the intended nested field immutably', () => {
  const item = createCustomSituation(fixedDate);
  const before = structuredClone(item.scenario);
  const title = withScenarioField(item.scenario, 'scenario.title', 'Café — planning: day 2');
  const reason = withScenarioField(title, 'options.0.effects.0.reason', 'Team’s plan; coût stays clear.');
  assert.equal(title.title, 'Café — planning: day 2');
  assert.equal(reason.options[0].effects[0].reason, 'Team’s plan; coût stays clear.');
  assert.equal(item.scenario.title, before.title, 'the original draft object is not mutated');
  assert.deepEqual(item.scenario, before);
  assert.throws(() => withScenarioField(item.scenario, 'scenario.missing.value', 'x'), /path does not exist/);
});

test('Studio schema accepts the default and enforces four roles, three stages, three options, bounds and text limits', () => {
  const item = createCustomSituation(fixedDate);
  assert.equal(validateSituation(item).valid, true);
  const badRole = structuredClone(item); badRole.scenario.measures[0].role = 'time';
  assert.equal(validateSituation(badRole).valid, false);
  const badStages = structuredClone(item); badStages.scenario.steps = 2;
  assert.equal(validateScenarioShape(badStages.scenario).valid, false);
  const badOptions = structuredClone(item); badOptions.scenario.options.pop();
  assert.equal(validateSituation(badOptions).valid, false);
  const tooManyEffects = structuredClone(item); tooManyEffects.scenario.options[0].effects.push(...Array.from({length:3},()=>structuredClone(tooManyEffects.scenario.options[0].effects[0])));
  assert.equal(validateSituation(tooManyEffects).valid, false);
  const badDomain = structuredClone(item); badDomain.scenario.measures[0].domain = [10, 10];
  assert.equal(validateSituation(badDomain).valid, false);
  const markup = structuredClone(item); markup.scenario.title = '<img src=x>';
  assert.equal(validateSituation(markup).valid, false);
});

test('balance checker enumerates all 27 unconditional engine paths and reports score median/outcomes deterministically', () => {
  const item = createCustomSituation(fixedDate);
  const report = checkBalance(item);
  assert.equal(report.valid, true);
  assert.equal(report.pathCount, 27);
  assert.ok(report.decisions.every(entry => entry.reachable));
  assert.ok(report.options.every(entry => entry.reachable));
  assert.ok(report.triggers.every(entry => entry.reachable));
  assert.ok(report.events.every(entry => entry.reachable));
  assert.deepEqual([...report.outcomes].sort(), ['strained', 'strong', 'workable']);
  assert.deepEqual([report.best, report.median, report.worst], [checkBalance(item).best, checkBalance(item).median, checkBalance(item).worst]);
  assert.equal(medianScore([1, 2, 4, 9]), 3);
  assert.equal(medianScore([9, 2, 1]), 2);
});

test('balance checker detects negative resources/time, inaccessible options and engine domain clamps', () => {
  const item = createCustomSituation(fixedDate);
  item.scenario.measures[0].domain = [-100, 100];
  item.scenario.startingState.resources = 2;
  const report = checkBalance(item);
  assert.equal(report.nonNegativeResourcesAndTime, false);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(issue => issue.severity === 'error' && issue.message.includes('negative')));

  const unreachable = createCustomSituation(fixedDate);
  unreachable.scenario.options[0].effects[0].delta = -1_000_000;
  assert.equal(checkBalance(unreachable).options.find(option => option.id === 'choice-one').reachable, false);

  const clamped = createCustomSituation(fixedDate);
  clamped.scenario.options[0].effects[0].delta = 100;
  const clampedReport = checkBalance(clamped);
  assert.equal(clampedReport.withinDomains, true);
  assert.ok(clampedReport.issues.some(issue => issue.severity === 'warning' && issue.message.includes('engine clamps')));
});

test('all six built-ins and their edited copies preserve deterministic engine outcomes', () => {
  for (const original of scenarios) {
    const before = structuredClone(original);
    const variant = createVariant(original, fixedDate);
    assert.equal(validateSituation(variant).valid, true, original.id);
    assert.equal(variant.scenario.id, variant.id);
    assert.deepEqual(original, before, 'variant creation does not mutate the built-in');
    let compared = 0;
    walk(original, run => {
      let variantRun = newRun(variant.scenario);
      for (const optionId of run.decisions) variantRun = applyDecision(variant.scenario, variantRun, optionId);
      assert.equal(matchesScenarioRun(original, run), true);
      assert.deepEqual(variantRun.state, run.state, `${original.id}: state`);
      assert.equal(variantRun.outcome, run.outcome, `${original.id}: outcome`);
      assert.deepEqual(variantRun.decisions, run.decisions);
      assert.deepEqual(variantRun.events.map(event => event.eventId), run.events.map(event => event.eventId));
      compared++;
    });
    assert.ok(compared > 0);
    assert.equal(checkBalance(variant).valid, true);
    const changed=structuredClone(variant.scenario);changed.startingState[changed.measures[0].key]+=1;assert.equal(matchesScenarioRun(changed,applyDecision(original,newRun(original),original.options[0].id)),false);
  }
});

test('custom preview uses a fresh real engine run and does not mutate scenario or unrelated active run', () => {
  const item = createCustomSituation(fixedDate);
  const active = applyDecision(item.scenario, newRun(item.scenario), item.scenario.options[0].id);
  const activeBefore = structuredClone(active);
  const itemBefore = structuredClone(item);
  const preview = runSamplePath(item);
  assert.equal(preview.status, 'completed');
  assert.deepEqual(active, activeBefore);
  assert.deepEqual(item, itemBefore);
});

test('JSON export/import round-trips validated data and rejects hostile, malformed or oversized payloads', () => {
  const item = createCustomSituation(fixedDate);
  const imported = importSituation(exportSituation(item), fixedDate);
  assert.equal(validateSituation(imported).valid, true);
  assert.equal(checkBalance(imported).valid, true);
  assert.notEqual(imported.id, item.id);
  assert.throws(() => importSituation('{'), /valid JSON/);
  assert.throws(() => importSituation('{"schemaVersion":1,"scenarioType":"echoes-scenario","scenario":{"__proto__":{"polluted":true}}}'), /Unsupported export schema|prototype/i);
  const payload = JSON.parse(exportSituation(item));
  payload.scenario.title = '<svg onload=alert(1)>';
  assert.throws(() => sanitizeScenario(payload.scenario), /plain text|markup/i);
  assert.throws(() => importSituation(' '.repeat(65 * 1024)), /64 KB/);
});

test('compressed share links round-trip and malformed or oversized fragments fail safely', async t => {
  if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined' || typeof btoa === 'undefined') return t.skip('CompressionStream is unavailable in this Node runtime.');
  const item = createCustomSituation(fixedDate);
  const url = await encodeShare(item, 'http://localhost/');
  const roundTrip = await decodeShare(new URL(url).hash, fixedDate);
  assert.equal(checkBalance(roundTrip).valid, true);
  await assert.rejects(() => decodeShare('#scenario=not-base64%%%'), /malformed/);
  await assert.rejects(() => decodeShare(`#scenario=${'A'.repeat(12_001)}`), /12 KB/);
  await assert.rejects(() => decodeShare('#scenario=AA'), /malformed|share/i);
});

test('storage migrates only recognized records and survives unavailable or corrupt storage', () => {
  const item = createCustomSituation(fixedDate);
  const saved = replaceSituation(emptyStudioState(), { ...item, draft: false });
  const storage = new MemoryStorage();
  assert.equal(saveStudioStorage(saved, storage), true);
  const loaded = loadStudioStorage(storage);
  assert.equal(loaded.state.situations.length, 1);
  assert.equal(loaded.state.situations[0].id, item.id);
  assert.equal(loadStudioStorage(undefined).persistent, false);

  const corrupt = new MemoryStorage(); corrupt.setItem(STUDIO_STORAGE_KEY, '{bad');
  const corruptResult = loadStudioStorage(corrupt);
  assert.match(corruptResult.warning, /could not be read/);
  assert.equal(corrupt.getItem(STUDIO_STORAGE_KEY), '{bad', 'failed migration leaves original data untouched');
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.doesNotThrow(() => loadStudioStorage(throwing));
  assert.equal(saveStudioStorage(saved, throwing), false);
});

test('Studio variants, duplicates, drafts and play gating stay isolated', () => {
  const item = createCustomSituation(fixedDate);
  const builtIn = scenarios[0];
  const variant = createVariant(builtIn, fixedDate);
  const state = replaceSituation(emptyStudioState(), { ...item, draft: false });
  const duplicate = duplicateSituation(item);
  assert.notEqual(duplicate.id, item.id);
  assert.equal(duplicate.draft, true);
  assert.equal(playable({ ...item, draft: false }), true);
  assert.equal(playable(item), false);
  const removed = deleteSituation(state, item.id);
  assert.equal(removed.situations.length, 0);
  assert.deepEqual(restoreAtIndex(removed.situations,0,state.situations[0]),state.situations,'Undo restores exact scenario data and original order');
  const effects=[{delta:1,id:'first'},{delta:-2,id:'deleted'},{delta:3,id:'last'}];
  assert.deepEqual(restoreAtIndex([effects[0],effects[2]],1,effects[1]),effects,'Undo restores an effect and its exact position');
  assert.equal(variant.scenario.id, variant.id);
  assert.equal(scenarios.some(s => s.id === variant.id), false);
});

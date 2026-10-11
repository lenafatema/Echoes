import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL, advanceBranchDay, applyAction, makeBranch, optionsFor, outcomeFor, restoreBranchAt, SUPPLIER_RISK_THRESHOLD } from '../src/simulation/engine.ts';

test('fresh branches retain the opening position and record the sponsor withdrawal before a real decision', () => {
  const branch = makeBranch('A', 'scale');
  assert.deepEqual(INITIAL, { budget: 50000, days: 7, morale: 75, readiness: 65 });
  assert.equal(branch.events[0].title, 'Main sponsor withdrew');
  assert.equal(branch.events[1].title, 'Reduce the event scale');
  assert.deepEqual(branch.state, { budget: 57000, days: 7, morale: 69, readiness: 60 });
  assert.equal(branch.awaitAdvance, true);
});

test('all initial decisions apply their stated engine rules', () => {
  assert.deepEqual(makeBranch('A', 'scale').state, { budget: 57000, days: 7, morale: 69, readiness: 60 });
  assert.deepEqual(makeBranch('A', 'sponsor').state, { budget: 59000, days: 6, morale: 72, readiness: 57 });
  assert.deepEqual(makeBranch('A', 'charge').state, { budget: 56000, days: 7, morale: 71, readiness: 62 });
});

test('decisions are rejected unless available and the turn is resolved before advancing', () => {
  const branch = makeBranch('A', 'scale');
  assert.equal(applyAction(branch, 'sponsor'), null);
  const advanced = advanceBranchDay(branch);
  assert.equal(advanced.state.days, 6);
  assert.equal(advanced.currentDay, 3);
  assert.equal(advanceBranchDay(advanced), null);
  assert.equal(applyAction(advanced, 'rehearse').state.budget, 53000);
});

test('supplier threshold uses a strict below comparison at, above, and below ₹48,000', () => {
  assert.equal(SUPPLIER_RISK_THRESHOLD, 48000);
  const onThreshold = advanceBranchDay(makeBranch('A', 'scale'));
  for (const budget of [48001, 48000, 47999]) {
    const prepared = { ...onThreshold, state: { ...onThreshold.state, budget: budget + 4000 }, history: [...onThreshold.history] };
    const action = applyAction(prepared, 'rehearse');
    const next = advanceBranchDay(action);
    assert.equal(next.situationId === 'supplier-risk', budget < 48000, `budget ${budget}`);
  }
});

test('conditional supplier and participant situations lead to distinct real choices', () => {
  let branch = makeBranch('A', 'charge');
  branch = advanceBranchDay(branch);
  assert.equal(branch.situationId, 'attendance-risk');
  assert.deepEqual(optionsFor(branch).map(option => option.id), ['subsidize', 'retain-fee']);
  branch = applyAction(branch, 'subsidize');
  assert.equal(branch.state.budget, 54000);
  assert.equal(branch.state.morale, 76);
  branch = advanceBranchDay(branch);
  assert.notEqual(branch.situationId, 'attendance-risk');
});

test('rewind restores state, event list, and pending decision; replay does not mutate original', () => {
  const first = makeBranch('A', 'scale');
  const day = advanceBranchDay(first);
  const prepared = applyAction(day, 'rehearse');
  const historic = restoreBranchAt(prepared, 1);
  assert.equal(historic.state.budget, 57000);
  assert.equal(historic.state.days, 7);
  assert.equal(historic.awaitAdvance, true);
  assert.equal(historic.events.length, 2);
  assert.equal(prepared.events.length, 4);
  assert.equal(prepared.state.budget, 53000);
});

test('opening-day outcome is derived from final readiness, morale, and budget', () => {
  assert.equal(outcomeFor({ budget: 1000, days: 0, morale: 50, readiness: 78 }), 'ready');
  assert.equal(outcomeFor({ budget: 1000, days: 0, morale: 50, readiness: 55 }), 'compromises');
  assert.equal(outcomeFor({ budget: 0, days: 0, morale: 50, readiness: 54 }), 'at-risk');
  let branch = makeBranch('A', 'sponsor');
  while (branch.status === 'active') {
    if (branch.awaitAdvance) branch = advanceBranchDay(branch);
    else branch = applyAction(branch, optionsFor(branch)[0].id);
  }
  assert.equal(branch.state.days, 0);
  assert.equal(branch.status, 'completed');
  assert.equal(branch.outcome, outcomeFor(branch.state));
  assert.equal(branch.events.at(-1).kind, 'ending');
});

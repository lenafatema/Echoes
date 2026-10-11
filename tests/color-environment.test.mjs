import test from 'node:test';
import assert from 'node:assert/strict';
import { colors, accentForScenario } from '../src/tokens/colors.ts';
import { resolveScenarioEnvironment } from '../src/world/scenario-environments.ts';

const builtIns = [
  ['college-tech-fest', 'stage', colors.scenarios.techFest],
  ['startup-product-launch', 'office', colors.scenarios.startup],
  ['restaurant-opening-week', 'kitchen', colors.scenarios.restaurant],
  ['flood-relief-camp', 'hall', colors.scenarios.flood],
  ['film-shoot-weather', 'set', colors.scenarios.film],
  ['harvest-before-rains', 'field', colors.scenarios.harvest],
];

test('each built-in scenario resolves to its own environment and palette pair', () => {
  for (const [id, environment, accent] of builtIns) {
    assert.equal(resolveScenarioEnvironment(id), environment);
    assert.deepEqual(accentForScenario(id), accent);
  }
});

test('theme-derived custom scenarios and unknown themes fall back safely', () => {
  assert.equal(resolveScenarioEnvironment('custom-id', 'kitchen'), 'kitchen');
  assert.equal(resolveScenarioEnvironment('custom-id', 'unrecognized-theme'), 'workshop');
  assert.deepEqual(accentForScenario('custom-id', 'field'), colors.scenarios.harvest);
  assert.deepEqual(accentForScenario('custom-id', 'unrecognized-theme'), colors.scenarios.custom);
});

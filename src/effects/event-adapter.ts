import type { Run } from '../engine/engine';
import type { Scenario } from '../scenarios/schema';
import type { PresentationEvent, PresentationEventType } from './types';

/** Maps only events newly recorded by the authoritative simulation engine. */
export function presentationEventsFor(scenario: Scenario, previous: Run | null, next: Run, runId = `${next.scenarioId}:${next.id}`): PresentationEvent[] {
  const known = new Set(previous?.events.map(event => event.id) || []);
  return next.events.filter(event => !known.has(event.id)).map(event => {
    const trigger = scenario.triggers.some(item => item.eventId === event.eventId);
    const type: PresentationEventType = event.eventId === 'ending' ? 'ending' : event.eventId === 'calendar' ? 'day' : trigger ? 'stinger' : event.optionId ? 'decision' : 'stinger';
    return Object.freeze({
      id: `${runId}:${event.id}`,
      runId,
      scenarioId: scenario.id,
      sourceEventId: event.id,
      type,
      title: event.title,
      changes: Object.freeze(event.changes.map(change => Object.freeze({ ...change }))),
      before: previous ? Object.freeze({ ...previous.state }) : undefined,
      after: Object.freeze({ ...next.state }),
    });
  });
}

export function rewindPresentationEvent(scenario: Scenario, prior: Run, restored: Run, runId = `${restored.scenarioId}:${restored.id}`): PresentationEvent {
  const changes = scenario.measures.flatMap(measure => {
    const before = prior.state[measure.key], after = restored.state[measure.key];
    return before === after ? [] : [{ measure: measure.key, delta: after - before, before, after, reason: 'Authoritative rewind restored the recorded earlier state.' }];
  });
  return Object.freeze({ id: `${runId}:rewind:${prior.events.length}:${restored.events.length}`, runId, scenarioId: scenario.id, sourceEventId: `rewind:${prior.events.length}`, type: 'rewind', title: 'Recorded state restored', changes: Object.freeze(changes.map(change => Object.freeze(change))), before: Object.freeze({ ...prior.state }), after: Object.freeze({ ...restored.state }) });
}

import type { PresentationEffectListener, PresentationEvent } from './types';

/** Small bounded, idempotent fan-out for presentation-only events. */
export class EffectSequencer {
  private seen = new Set<string>();
  private listeners = new Set<PresentationEffectListener>();
  private readonly capacity: number;
  constructor(capacity = 500) { this.capacity = capacity; }
  subscribe(listener: PresentationEffectListener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  publish(events: readonly PresentationEvent[]) {
    const fresh: PresentationEvent[] = [];
    for (const event of events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id); fresh.push(event);
      if (this.seen.size > this.capacity) this.seen.delete(this.seen.values().next().value as string);
    }
    for (const event of fresh) for (const listener of this.listeners) listener(event);
    return fresh;
  }
  clear() { this.seen.clear(); }
}

export const effectSequencer = new EffectSequencer();

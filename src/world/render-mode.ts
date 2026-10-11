export type WorldRenderMode = 'world' | 'lite' | 'static';

export interface WorldRenderConditions {
  forcedStatic: boolean;
  worldFailed: boolean;
  requestedLite: boolean;
  slowWorld: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
}

/** Reduced motion changes choreography, not whether a capable device can render the world. */
export function resolveWorldRenderMode(conditions: WorldRenderConditions): WorldRenderMode {
  if (conditions.forcedStatic || conditions.worldFailed) return 'static';
  if (conditions.requestedLite || conditions.slowWorld || conditions.lowPower || conditions.reducedMotion) return 'lite';
  return 'world';
}

export function worldFallbackReason(forcedStatic: boolean, failure?: string | null): string {
  if (forcedStatic) return 'Static illustration mode was requested with ?static=1.';
  if (failure) return failure;
  return 'The 3D room is unavailable. The illustrated game remains playable.';
}

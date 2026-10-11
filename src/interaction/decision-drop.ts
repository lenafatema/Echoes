export interface PointerPosition { x: number; y: number }
export interface DropTargetRect { left: number; top: number; right: number; bottom: number }
export interface DecisionCommitGate { current: boolean }
export type WorldDropResolver = (point: PointerPosition) => boolean;

let worldDropResolver: WorldDropResolver | null = null;

/** The stage target is an HTML rectangle aligned with the active hero and works without WebGL. */
export function isPointInsideDropTarget(point: PointerPosition, rect: DropTargetRect | null | undefined): boolean {
  return !!rect && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

/** Shared by pointer, keyboard, click, and decision-clock paths to prevent double commits. */
export function claimDecisionCommit(gate: DecisionCommitGate): boolean {
  if (gate.current) return false;
  gate.current = true;
  return true;
}

/** The mounted R3F scene registers a raycast; null means use the accessible/static HTML target. */
export function registerWorldDropResolver(resolver: WorldDropResolver): () => void {
  worldDropResolver = resolver;
  return () => { if (worldDropResolver === resolver) worldDropResolver = null; };
}

export function queryWorldDropTarget(point: PointerPosition): boolean | null {
  return worldDropResolver ? worldDropResolver(point) : null;
}

/** Presentation-only signal used to illuminate the physical target while a token is dragged. */
export function setWorldDropTargetActive(active: boolean): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('echoes:drop-target-active', { detail: { active } }));
}

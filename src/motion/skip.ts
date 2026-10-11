export const SKIP_CAMERA_EVENT = 'echoes:skip-camera';
export const SKIP_UI_EVENT = 'echoes:skip-ui-motion';

/** Completes only presentation motion. Simulation actions remain owned by React. */
export function skipCurrentAnimation() {
  window.dispatchEvent(new Event('echoes:skip-world-motion'));
  window.dispatchEvent(new Event(SKIP_CAMERA_EVENT));
  window.dispatchEvent(new Event(SKIP_UI_EVENT));
}

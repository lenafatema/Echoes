# ECHOES

Run the local app with `npm run dev`.

## How to add a scenario

1. Copy a file in `src/scenarios` and edit its title, context, four measure definitions, starting values, three choices, event copy, drift, thresholds, and outcome score weights. Keep each choice effect keyed to one of the four measure keys.
2. Define explicit trigger rules for the follow-on event records. If the scenario has an opening change, put it in `openingEffects`; thresholds are deterministic and support `below` (strict `<`) or `atMost` (`<=`).
3. Add a small inline SVG illustration component under `src/illustrations` that accepts the scenario and live measure state, then register it in `src/illustrations/index.tsx`.
4. Import the scenario in `src/scenarios/index.ts` and add it to the exported scenario list.
5. Run `npm run validate`, `npm test`, and `npm run build`. Validation explores every available decision path and checks event reachability, measure domains, nonnegative resource/time values, and all three outcome categories.

## Persistent 3D world

`src/world/WorldCanvas.tsx` owns the single lazily loaded React Three Fiber Canvas. It stays mounted while the active app screen, scenario, branch, and rewind position change. `src/world/WorldScene.tsx` renders the picker miniatures and the active scenario from the selected engine snapshot; the four visual roles map to each scenario's existing `resources`, `time`, `people`, and `progress` measures. The existing inline SVG illustrations remain the functional fallback.

- `npm run dev -- --host 127.0.0.1` starts the local app.
- Add `?lite=1` to reduce pixel ratio, anti-aliasing, and figure count.
- Add `?static=1` to use the fully functional SVG/HTML presentation without WebGL.
- The app selects static mode for reduced-motion preferences and after WebGL initialization failure; low measured frame rate switches to lite mode. The top bar exposes the Reduce motion setting and reports the active fallback mode.

## Motion system

`src/motion` centralizes durations, easing curves, the camera-skip event, and `skipCurrentAnimation()`. Framer Motion handles screen and metric transitions; GSAP handles camera travel, picker rotation, the intro cover, and consequence-group separation. The 3D scene is reconstructed from the selected scenario snapshot and does not alter simulation data.

See [docs/motion-spec.md](docs/motion-spec.md) for per-screen timing and accessibility rules, and [docs/motion-demo.md](docs/motion-demo.md) for the two-minute walkthrough.

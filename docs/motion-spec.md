# ECHOES motion specification

## Direction

The motion reference was reviewed for broad craft principles: a clear focal area, confident scale, deliberate pacing, and transitions that preserve visual hierarchy. ECHOES applies those principles to its own procedural worlds, editorial interface, and simulation state. It does not reproduce the reference's layout, artwork, typography, or signature motion.

Motion has one lead per screen. Camera and object travel explain focus or causality; typography and controls support that movement. The simulation engine remains authoritative. Presentation timelines can be skipped and never apply a game action.

## System ownership

- `src/motion/tokens.ts` is the single timing, separation, and rendering-token source.
- `src/motion/easings.ts` defines shared CSS/Framer curves and GSAP approximations. Framer Motion receives cubic-bezier tuples because the CSS string form is not accepted by its transition API. GSAP uses `power2.out` for entrance and `power2.inOut` for travel.
- Framer Motion owns HTML screen, shared-layout, option, metric, and overlay transitions.
- GSAP owns the persistent scene's camera, procedural cover, picker arrangement, comparison split, consequence groups, and history markers.
- `skipCurrentAnimation()` dispatches presentation-only completion events. It does not touch the engine.
- The single Canvas remains mounted while gameplay screens, paths, and recorded steps change. The SVG fallback keeps all interactions usable without WebGL.

## Shared timing and easing

| Token | Implemented value |
|---|---:|
| Micro | 120ms |
| Small | 220ms |
| Option ink fill | 250ms |
| Medium | 400ms |
| Consequence separation | 420ms |
| Consequence | 550ms |
| Reassembly | 500ms |
| Picker placement | 550ms |
| Intro cover | 800ms |
| Result history line | 800ms |
| Large | 700ms |
| Scene | 1000ms |
| Sibling stagger | 40ms |
| Picker hover lift | 0.15 world units |
| Compare separation | 2.05 world units per path |

Entrance is `cubic-bezier(0.22, 1, 0.36, 1)` (GSAP `power2.out` approximation); travel is `cubic-bezier(0.65, 0, 0.35, 1)` (GSAP `power2.inOut`); exit is `cubic-bezier(0.4, 0, 1, 1)`. No spring, bounce, elastic easing, or looping decoration is used.

## Screen choreography

### Picker

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Tile text entrance | 350ms | Entrance | 0ms |
| Hover/focus lift | 220ms | Entrance | 0ms |
| Arc wheel adjustment | 220ms | Entrance | On wheel |
| Select and focus a world | 900ms | Travel | On selection |
| Other worlds return to arc | 550ms | Entrance | With selection |

Six accessible HTML scenario controls correspond to six procedural worlds on one shallow arc. Pointer drag and wheel rotate the arc inside a bounded range; keyboard selection remains available. Selection focuses the same world that becomes the intro hero.

### Intro

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Shared scenario composition | 700ms | Entrance | 0ms |
| Camera approach | 900ms | Travel | With selection |
| Segmented cover reveal | 800ms | Travel | With camera |
| Intro copy | 350ms | Entrance | 0ms |

The cover is a subdivided procedural sheet, not a cloth simulation. In fallback mode, the selected inline SVG and copy fade into the same screen.

### Decision

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Camera settle | 750ms | Travel | On screen change |
| Option press | 120ms | Entrance | Pointer down |
| Ink fill | 250ms | Entrance | On selection |
| Unchosen option fade/lower | 200ms | Exit | 40ms sibling stagger |
| Physical state response | 550ms | Entrance | With committed state |
| Screen text | 400ms | Entrance/exit | 0ms |

Options are the engine's actual scenario choices. Their handlers are guarded against duplicate submission; the choice is committed once, and the hero reconstructs from the resulting run.

### Consequence

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Camera to consequence view | 400ms | Travel | 0ms |
| Role groups separate | 420ms | Travel | With new state |
| Changed measure emphasis | 400ms | Entrance | In engine change order |
| Measure count | 450ms | Entrance | Sequential reveal |
| Cause copy | 400ms | Entrance | After changed measures |
| Hero reassembly | 500ms | Travel | Before next screen |

The groups map to the scenario's existing `resources`, `time`, `people`, and `progress` measure roles. Unchanged measures do not receive change emphasis. The consequence heading, values, and changes are derived from the recorded state and event.

### Result

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Camera pull-back | 700ms | Travel | 0ms |
| Recorded progress history line | 800ms | Entrance | On result view |
| History point scale-in | 120ms | Entrance | Evenly across line draw |
| Result text | 400ms | Entrance | With camera settle |

The 3D strand uses the actual run history's progress values. When an alternative branch exists, the world draws each actual history with solid/dashed treatment and labels in HTML. The accessible fallback chart uses the same run history.

### Compare

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Shared-base path separation | 700ms | Travel | 0ms |
| Camera widen/sweep | 700ms | Travel | With separation |
| Difference rows | 400ms | Entrance | 40ms sibling stagger |
| Verdict line | 400ms | Entrance | After values |

Path instances use the same scenario component and their own stored snapshots. Separation is 2.05 world units in each direction. Path identity is also communicated by labels and line style, not color alone.

### Why overlay

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Camera emphasis | 550ms | Travel | 0ms |
| Overlay entrance/exit | 220ms | Entrance/exit | 0ms |
| Recorded rule details | 220ms | Entrance | 40ms sibling stagger |
| Return camera | 550ms | Travel | On close |

The dialog lists engine-recorded rule effects, causes, event sequence, and actual metric changes for each path. Escape and the close control return to the previous screen.

### Rewind

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Restore recorded run snapshot | Immediate | None | On scrub |
| Camera to step-derived preset | 220–750ms | Travel | With snapshot |
| Hero geometry reconciliation | 420ms | Travel | With snapshot |
| UI state transition | 220ms | Travel | With snapshot |

Rewind calls the engine's history restoration; it does not reverse an arbitrary animation. A new decision from an earlier step follows the engine's branch/fork rule and preserves the prior path.

### Loading and fallback

| Step | Duration | Easing | Delay |
|---|---:|---|---:|
| Canvas loading rule | Until ready | Linear | Initial world mount |
| Loading line | 400ms | Entrance | While mounting |
| SVG fallback transition | 200ms | Fade | Static/reduced-motion selection |
| WebGL failure fallback | Immediate mode switch | None | On context/render failure |

## Shared identity, skip, and accessibility

Stable scenario IDs select the same procedural world in picker, intro, decision, consequence, result, compare, and Why. Camera presets are named by screen; recorded step identity adjusts decision/consequence framing. Timelines are killed on replacement and on unmount. A new screen does not take ownership of an unfinished predecessor timeline.

Clicking non-interactive screen space or pressing Space dispatches a presentation skip. Space is ignored inside buttons, links, inputs, and sliders. On consequence, skipping reveals the recorded measures immediately. Reduced motion and `?static=1` use the same gameplay and data with static geometry and short fades. `?lite=1` removes real-time shadows and limits DPR and active invalidation to 30fps.

The Canvas is decorative (`aria-hidden`); the HTML provides accessible scenario descriptions, controls, measures, history, and dialog text. Keyboard and touch controls do not depend on 3D picking.

## Verification note

Chrome on the available Mac rendered the R3F Planning Room and its procedural scenario world. Browser checks covered choosing Tech Fest, entering the decision screen, committing the scale-reduction option once, reading the resulting supplier-risk consequence, and opening the keyboard-operable Planning Room destinations menu and Radio settings. The session entered Lite View; no frame-rate measurement is claimed. The app's SVG/HTML fallback remains available under `?static=1` and on actual renderer/context failures.

The earlier Static View observation was traced to a stale Vite process serving an older Canvas fallback module that reported a failure on mount. `WorldCanvas` now creates the renderer explicitly and reports only renderer initialization, context-loss, or React rendering failures; restarting Vite and using the fresh server restored the live room.

The exact 1440 × 900 and 390 × 844 layouts, Safari, touch drag/drop, audible output, and detailed landmark hit-testing were not verified in this pass. The documented font families are preferred names with system fallbacks; the repository has no bundled font files, and external font fetching is intentionally not required.

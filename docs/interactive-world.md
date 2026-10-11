# Interactive world

## Decision tokens

The existing decision options remain real buttons. Pointer, touch, and stylus drags use pointer capture so the token follows the pointer after it leaves the row. A drop inside the outlined stage target commits the same `onChoose` action as a click, Enter, Space, or the existing 1–3 shortcut. A drop outside the target returns the row to its original position and does not commit. A ref guards the action so the captured `pointerup` and the browser's subsequent click cannot apply it twice.

The target is a clearly outlined HTML region positioned over the existing hero composition. It is kept separate from the Canvas hit-testing so it also works in static mode and does not require a 3D pointer raycast. The Canvas remains mounted in world/lite mode and does not intercept the option controls.

## Ghost previews

`src/interaction/preview.ts` reads only the selected option's explicit scenario effects and the affected measure definitions. It maps those measures to the existing Resources, Time, People, and Progress visual roles. The UI and scene show directional language with “may”; exact future values are not calculated or displayed. Conditional threshold and drift rules are deliberately not executed for previews.

Preview state belongs to `DecisionScreen` and is passed to the world as visual roles only. It does not call the engine, create a history snapshot, or touch local storage. The R3F scene shows role-shaped translucent forms; the static fallback shows the same roles as simple ghost marks. The live preview copy is exposed through an `aria-live` region and keyboard focus activates it too. Leaving the choice group, changing focus, committing, rewinding, or changing screens clears it.

## Decision tree and restoration

`src/branch-tree/branchTreeAdapter.ts` projects each saved `Run.history` snapshot into a node. Node metric values and day values are copied from that snapshot; it does not replay rules or invent states. The current A/B runs and archived runs are separate paths. The root and each decision snapshot appear in the selectable history. A terminal snapshot labels both the final decision and the recorded outcome because the engine stores the final decision and ending in one terminal snapshot.

In world/lite mode, the persistent Canvas renders the paths as procedural curves and clickable nodes on one shared base. In static/reduced-motion mode, an inline SVG provides the overview. HTML node controls remain available in either mode. Selecting a node highlights its saved values; activating it calls the existing snapshot restoration path. Archived snapshots are promoted into their A/B slot for inspection while the displaced slot is retained in the archive. `Return to result` restores the latest state of the active path.

Starting a new run now archives the existing A/B branches instead of silently discarding their histories. Reset still clears the selected scenario's saved progress using the app's existing reset action.

## Accessibility and reduced motion

- Each choice is a semantic button with keyboard activation and a visible focus state.
- The stage target is visually indicated; the option button remains the non-drag alternative.
- Pointer capture supports mouse, touch, and stylus. Invalid drops provide a calm text instruction.
- Preview text is announced; it contains directional language only.
- Branch nodes are semantic buttons; focusing a node updates the selected snapshot and activating it restores that state.
- Reduced motion and `?static=1` keep all decisions, previews, tree controls, and state restoration available without relying on WebGL.

## Verification and known limitations

- The drop target is an accessible HTML target aligned over the hero area, not a per-mesh Three.js raycast. This keeps drag behavior consistent across WebGL, lite, and static modes. Pointer capture retains a drag after leaving the option row; a shared commit gate rejects a duplicate pointer/click or clock submission.
- The branch tree has one stored snapshot per completed decision. The engine does not store separate snapshots for every internal event within a decision, so those events remain in the run's event history and the associated decision node points to the resulting snapshot.
- Sound is generated locally with Web Audio and is off by default. Browser-policy and preference code exists; audible output needs a listening check on a real output device.
- Chrome on the current machine rendered the live persistent R3F Canvas at `http://127.0.0.1:5174/`. It moved to Lite View during the run. The tech-fest decision screen was used to drag one option onto the stage (commit observed once), then make an invalid drop (the decision stayed uncommitted and the cancellation instruction appeared). The resulting supplier-risk consequence screen showed the real budget, day, morale, and readiness deltas. The keyboard-accessible Planning Room destination menu and Radio settings were also opened. The capture was not a full 1440 × 900 viewport.
- The earlier Static View observation came from a stale Vite process serving an older `WorldCanvas` module whose Canvas fallback component called the failure callback on mount. The current source uses the renderer's textual fallback and reports actual renderer, context-loss, and React render failures. Restarting Vite against the current source and opening the fresh port restored the live 3D world.
- The current browser entered Lite View on this device/session. Its exact reason (hardware capability versus the two-second low-frame-rate guard) was not exposed by the UI, so this pass does not claim a measured frame rate or identify which predicate fired.
- Safari loaded the picker in Lite View, but scenario selection was interrupted and not verified. Touch hardware and 390 × 844 / 1440 × 900 exact viewport checks remain unverified. Automated tests cover drag-target geometry and the exactly-once commit gate; Chrome browser testing covered one valid and one invalid mouse drop. Touch/stylus and repeated click-after-drop deduplication still need device testing.

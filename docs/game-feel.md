# ECHOES game feel

## Event flow

The simulation remains authoritative. A committed choice calls `applyDecision` first. `presentationEventsFor` then maps only newly recorded engine events into immutable presentation records (`runId + source event id`). `EffectSequencer` deduplicates those IDs before notifying the UI. Presentation settings, sound, particles, and camera motion do not call back into the engine.

Visual particle parameters use a small FNV-1a-seeded linear-congruential generator in `src/effects/particles.ts`. The event key determines each particle's initial position and velocity. The active burst is instanced and capped at 150; current decision bursts use 18 paper pieces. This is visual-only and repeatable for an event ID.

## Implemented feedback

| Feedback | Source event / condition | Current timing | Easing / sound | Cancellation and Reduced / Off |
|---|---|---:|---|---|
| Option press and ink sweep | User selects an available option; engine commit remains synchronous | 90 ms press; 250 ms fill | CSS entrance easing; low commit tone | Input is not held for animation. Reduced shortens/fades; Off removes decorative treatment. |
| Decision paper burst | New engine event from a committed choice | Particle lifetimes 350–1,150 ms | Seeded, instanced paper; commit tone | A newer event replaces the burst seed. Disabled in Reduced, Off, Lite, hidden tab and static mode. |
| Metric reveal | Actual recorded metric change on the consequence screen | 450 ms counter | Existing entrance easing; quiet tick | Consequence can be skipped. Reduced uses short presentation; Off leaves final values readable. |
| Chain label | At least two distinct measures improved in a step | Screen reveal | Engine delta polarity via `higherIsBetter` | No label for unchanged or adverse measures; count does not alter score. |
| Event title slip | A real event matching a scenario trigger | 600 ms | Paper slip; no additional invented event | Click, Space or Escape dismisses; Reduced/Off omit the decorative slip. |
| Setback shake | At least one actual adverse delta, Full mode, user enabled | 120 ms; at most 3 CSS px | No sound required | Off by default; disabled outside Full mode. Canvas wrapper only; no layout or focus movement. |
| Tool token | Existing Foresight, Rewind or Advisor charge is spent | 120–340 ms | Existing physical token motion; tool or reverse cue | Token animation cannot spend a charge. Reduced/Off show the authoritative final token state. |
| Rewind | Engine restores its previous recorded snapshot | Immediate state restore | Reverse sweep if sound is enabled | Presentation follows the restored engine run; it does not reverse-engineer state. |
| Score and stars | Existing completed-run result and star evaluator | Score count: 550 ms; earned-star stagger: 350 ms | Existing UI entrance | Reduced motion directly shows final values. Revisiting results does not award again. |
| Personal best | Existing game store reports a genuinely new best | 500 ms result press | Entrance easing | No effect when score ties or fails to improve. |
| Boot curtain | Local first visit in a session | 900 ms, skippable | Quiet progress line, no network-progress claim | Click, Enter or Space skips; reduced/static preference starts in final state. |
| Landmark camera glide | Accessible Planning Room destination selected | 700–1,000 ms from shared camera preset | Shared travel easing | New preset cancels the previous timeline; reduced/zero movement snaps to destination. |

## Sound policy

Sound is off by default. Every cue is synthesized through Web Audio; there are no external sound assets. Enabling sound is a direct user gesture, after which the stored sound preference and volume configure the master gain. Event gain is capped and a short 18 ms gate prevents overlapping peaks. The ambient bed is very quiet, starts only after explicit enablement, and fades when the document is hidden or sound is disabled. Effects Off mutes cues while leaving all game actions available. Browser audio suspension or Web Audio construction failures are non-fatal.

## Effects modes and persistence

`src/effects/settings.ts` stores mode, camera movement, master volume, optional setback-only shake, and cosmetic room finish/tone under `echoes.effects.v1`. Defaults are Full on pointer-precise devices and Reduced on coarse-pointer devices. `prefers-reduced-motion` enforces at least Reduced; `?static=1` forces Off/static rendering; `?lite=1` keeps the simulation available while reducing rendering cost. Settings are clamped and storage failures fall back safely.

Cosmetics are presentation-only. Natural/walnut finish and room/amber lamp tone affect only room materials and light. Walnut is available from Planner level 2, amber from level 6. The room lamp also warms modestly with campaign stars. No cosmetic setting is passed to the simulation engine.

## Design tokens

The active token source is `src/tokens/index.css` (imported by `src/main.tsx`). It defines the parchment/brown palette, Young Serif / Hanken Grotesk / IBM Plex Mono stacks, spacing scale, control and panel radii, type sizes, easing curves, motion durations, layering, contact rule and material roughness. World-space dimensions are kept in `src/environment/room-layout.ts` and the diorama components; they are not expressed in UI pixel tokens.

See [style-guide.md](style-guide.md) for usage and copy guidance.

## Known limits

- Landmark destinations are currently selected through the accessible HTML Planning Room menu. Room landmark meshes are not raycast-selectable; the menu is the supported equivalent.
- The room is procedural and persistent in the existing Canvas, but not every requested prop has an individual animated behavior. Curtains, figures, dust ambience and a camera hit-stop are not implemented as separate ambient systems.
- The decision burst is a small paper-dust presentation. It is not a full scenario-specific physical impact animation, and tool-use feedback is limited to the existing token motion and sound.
- The stinger uses the actual triggered engine event title. Stingers are omitted when a trigger did not fire.
- Star, rank, achievement and best presentation uses existing result feedback; a separate 3D reward stamp/medal placement ceremony is not implemented.
- Fonts use a Google Fonts CSS import with local serif/sans/mono fallbacks. If offline, fallback fonts are used.
- The in-app browser used in this session displayed Static View, so it did not provide a visual check of live WebGL geometry or motion.

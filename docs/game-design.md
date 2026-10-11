# ECHOES game layer

## Core loop and source of truth

The existing engine (`src/engine/engine.ts`) remains authoritative: open a scenario, read the active event, choose one valid option, inspect the recorded consequences, and repeat until the engine emits an ending. The game layer reads the engine snapshots and adds mission evaluation, a deterministic score, tool charges, campaign records, and replay. It does not alter option effects, drift, triggers, thresholds, or outcomes.

All six current scenarios require three decisions. Completion is based on the engine's `completed` status and its recorded decision count. A completed run is saved once by its run key. Reopening a result does not award a second record. Each path has its own engine branch and game session; rewound or replaced branches are retained in the bounded branch archive.

When no recorded opposite path exists, **Try the other path** enumerates valid continuations from a different first decision using the same engine. It selects the completed run with the greatest normalized distance from the current final measures; scenario option order breaks ties. The chosen run is replayable and gets its own branch/session. If all valid engine outcomes converge to the same measures, the UI reports that honestly rather than changing the rules or inventing a delta.

## Scenario missions and score configuration

Every star condition in a row is conjunctive: every listed threshold must be met. The Completion star requires all three decisions and a real engine ending. Mission and Mastery use the actual final measures listed below.

| Scenario | Completion star | Mission star | Mastery star | Score weights R/T/P/G/S/U | Ranks (Bronze / Silver / Gold / Platinum) |
|---|---|---|---|---|---|
| College tech fest | Complete 3 decisions | Readiness ≥55; morale ≥50 | Readiness ≥65; budget ≥₹57,000 | .10 / .05 / .20 / .40 / .15 / .10 | 0 / 50 / 60 / 70 |
| Startup product launch | Complete 3 decisions | Runway ≥₹5L; readiness ≥85; team energy ≥60 | Runway ≥₹10L; readiness ≥86 | .15 / .05 / .20 / .35 / .15 / .10 | 0 / 60 / 65 / 70 |
| Restaurant opening week | Complete 3 decisions | Kitchen readiness ≥90; staff morale ≥50 | Cash ≥₹40,000; readiness ≥98; morale ≥65 | .20 / .05 / .20 / .30 / .15 / .10 | 0 / 60 / 66 / 74 |
| Flood relief camp | Complete 3 decisions | Supplies ≥65; camp readiness ≥85; volunteer strength ≥60 | Supplies ≥90; readiness ≥99 | .15 / .10 / .20 / .30 / .15 / .10 | 0 / 58 / 64 / 71 |
| Film shoot in bad weather | Complete 3 decisions | Scenes completed ≥35; budget ≥₹120,000 | Scenes completed ≥38; budget ≥₹150,000 | .15 / .05 / .20 / .35 / .15 / .10 | 0 / 62 / 67 / 72 |
| Harvest before the rains | Complete 3 decisions | Crop secured ≥75%; worker strength ≥55 | Crop secured ≥75%; funds ≥₹40,000 | .20 / .05 / .20 / .30 / .15 / .10 | 0 / 50 / 53 / 56 |

`R/T/P/G/S/U` mean Resources, Time, People, Progress, earned Stars, and unused Tools. Each scenario has one measure for each of the four engine roles. The Harvest scenario's engine caps Crop secured at 75%; its Mastery goal therefore adds a funds reserve rather than claiming a higher crop threshold.

### Scoring formula

For each available measure, normalize the value against its declared chart domain, clamp the result to `[0, 1]`, and invert it when `higherIsBetter` is false. Each role contribution is its normalized measure multiplied by that scenario's role weight. Add:

```text
score = round(100 × (R×wR + T×wT + P×wP + G×wG + (stars/3)×wS + (unused charges/4)×wU))
```

The final score is clamped to `[0, 100]`. Missing/non-finite measures normalize to zero; zero-width domains normalize to zero. The live HUD preview uses zero earned stars because the run is unfinished, but includes the actual current measures and remaining charges. The result uses the evaluated star count and final engine state. The same inputs always produce the same integer.

The engine advances the time measure to its deadline when the third decision resolves, so completed runs currently finish at zero remaining time. The configured Time weight is still applied, but that component is zero for completed outcomes under these engine rules. This is a known engine limitation, not a score adjustment.

Ranks are inclusive lower thresholds and the next rank begins at its configured threshold. Ties do not replace a personal best. The exhaustive validator reports actual minimum and maximum scores, decisions establishing those scores, and a path inside each rank interval. Current base-scenario ranges include legal tool-use counts in the score calculation:

| Scenario | Achievable score range | Example minimum path | Example maximum path | Rank bands |
|---|---:|---|---|---|
| College tech fest | 38–71 | charge → charge → charge; all 4 charges used | sponsor → sponsor → sponsor; no charges used | All four reachable |
| Startup product launch | 49–72 | choice-three ×3; all 4 charges used | choice-one ×3; no charges used | All four reachable |
| Restaurant opening week | 40–75 | choice-one ×3; all 4 charges used | choice-two ×3; no charges used | All four reachable |
| Flood relief camp | 45–77 | choice-three ×3; all 4 charges used | choice-one → choice-two → choice-three; no charges used | All four reachable |
| Film shoot in bad weather | 44–73 | choice-three → choice-three → choice-one; all 4 charges used | choice-one → choice-one → choice-three; no charges used | All four reachable |
| Harvest before the rains | 44–64 | choice-two → choice-three → choice-two; all 4 charges used | choice-three ×3; no charges used | All four reachable |

`npm run validate` exhaustively walks engine-valid decision sequences and enumerates the 12 remaining-charge combinations for each terminal state. It also verifies that Mission and Mastery are each achievable, all three engine outcomes are reachable, all events are reachable, and no role value leaves its domain or has negative resource/time. The threshold rank bands are checked with actual scores, not merely `score >= threshold`.

## Limited tools

Every genuinely new run begins with **Foresight 2**, **Rewind 1**, and **Advisor 1**. Branch exploration after a completed run starts a separate free session. Merely changing screens does not restore charges.

- **Foresight** consumes one charge when its direction preview is revealed. It reads only explicit option effects and reports directions such as resources may decrease or progress may advance. It never runs a second simulation, exposes exact values, creates history, or mutates engine state. A conditional trigger can change the committed result.
- **Rewind** consumes its single charge only if the active branch is at its latest state and has a decision to undo. It restores `history[length - 2]` with the engine snapshot mechanism, records the tool action, and preserves the displaced branch. Timeline scrubbing remains a separate history inspection control.
- **Advisor** offers a deterministic preference from explicit option effects. The Steward weights stability and people, the Visionary weights progress, and the Treasurer weights resources. Opening the panel is free; revealing valid advice spends the charge. Advice states that it is a preference, not a guarantee.

The HTML controls remain operable without WebGL. The 3D scene also renders four small physical charge tokens; spending one animates the corresponding token into the diorama. Charges and labels remain in the HUD.

## Campaign and Free play

The first two scenarios are always unlocked. From the third onward, a scenario unlocks after any earlier scenario has at least one earned star. The campaign counter sums each scenario's highest star count and caps at 18, so replaying cannot inflate it. Free play is an in-memory toggle that bypasses locks without modifying campaign progress. A daily challenge can select a locked scenario directly.

## Daily challenge

`dailyChallengeFor` hashes the local calendar date with game version `1` and picks one of the six scenarios. It lowers that scenario's starting Resources measure by 6% of its declared domain span, clamped to the domain. It changes only a cloned `startingState`; base scenarios and decision rules are unchanged. The date, scenario, modifier, and actual modified starting state are stored with the run and used for replay. The Decision Clock starts off and cannot be enabled for a daily run.

## Achievements

Achievements are local, unique records with run evidence:

- **Steady Hand:** every applicable People or Progress measure with a `0–100` domain ends above 50. Measures in other units/ranges are not treated as percentages.
- **Penny Wise:** final Resources exceed 40% of that run's recorded starting Resources.
- **No Regrets:** the run log has no Rewind action.
- **Both Ways:** two completed, replay-verified runs for the scenario have distinct first decisions, or the recorded branch completion flag is confirmed against a distinct completed run during restoration.
- **Foresighted:** at least two stars and no Foresight action in the run log.

The campaign panel shows a distinct geometric badge and the evidence. Achievement IDs are awarded once. During restoration, saved runs are replayed against the current engine; derived stars, score, rank, personal bests, campaign stars, and achievements are recomputed rather than trusted from stored summaries.

## Decision Clock

The optional clock is off by default. When explicitly enabled for a normal run, each active decision receives 20 seconds of visible elapsed time. At zero, the first currently valid option from the engine's ordered option list commits once. Manual input wins the race if it commits first. The clock stops when the decision screen leaves, pauses while the tab is hidden, and resumes from its previous remaining time. Daily runs keep it off.

## Persistence and replay

Game progression uses versioned local storage key `echoes.game.v1`; engine branches remain under their existing scenario-save key. Both reads are guarded. JSON, run, session, charge, and date fields are checked before use. A malformed or unsupported version safely becomes empty progression, quota/security errors fall back to in-memory progression, and referenced sessions are pruned when their active/archived branch is removed. Completed run history is capped at 50 entries; per-scenario engine branch archives are capped at 50.

Replay seeds the current deterministic engine with the recorded scenario start state and replays the recorded option IDs. If the current engine cannot reproduce its final measures and outcome, the record is marked as a replay mismatch and is excluded from reconstructed awards; the UI reports the mismatch instead of replacing the stored result silently. Replay does not simply display a saved final snapshot as if it were simulated.

## Sound, reduced motion, and fallback

Generated Web Audio cues are optional and off by default. A user gesture is required by the browser before audio can resume. Cues cover decision commit, changed-metric reveals, tool use, rewind, and newly earned completion stars; sound is never required for feedback. The visible sound toggle is stored with game progression.

`?static=1`, the Reduce motion setting, or `prefers-reduced-motion` uses the functional SVG/HTML version. `?lite=1` reduces 3D rendering cost. The same engine state drives all presentations.

## Known limitations

- Time is zero at every completed run under the current deadline logic, so its score weight does not distinguish final paths.
- Foresight describes explicit option deltas only; it does not estimate conditional threshold effects or exact future values.
- The daily modifier currently supports a deterministic reduction to the actual Resources measure only.
- Achievement badges are procedural CSS geometry in the campaign panel rather than separate 3D meshes.
- Sound does not currently include a branch-selection cue.
- WebGL layout, mobile touch hardware, Safari, and frame rate still require manual device/browser verification when unavailable to this environment.

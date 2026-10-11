# Scenario Studio

Scenario Studio is a local authoring layer over ECHOES' existing `Scenario` model and deterministic engine. It does not implement a second simulator. Studio previews call `newRun` and `applyDecision` on a fresh engine run; playable custom and edited scenarios enter the same engine after validation and balance checks.

## Authoring flow and compatibility boundary

The data pipeline is:

`input → StudioSituation draft → runtime schema validation → engine-backed balance check → saved playable scenario`

Built-in scenario objects are treated as immutable. Editing a built-in clones the object, assigns a stable Studio ID, and stores its original ID in `metadata.baseScenarioId`. Studio storage never writes into the built-in scenario files. Campaign stars, built-in best scores, unlocks, daily challenges, and campaign achievements are gated to the six original scenario IDs.

The engine schema currently has exactly three sequential stages and a shared list of three options. The same three responses are therefore available at each stage; the editor cannot author a different option menu or a different decision headline for each stage. Existing triggers select a ledger event for a `(step, optionId)` pair. They can record an event, but cannot conditionally change the next decision menu. The Rules step calls this out rather than simulating a UI-only trigger. An engine `timeCost` option field and trigger-specific effects are also not applied by the current engine; non-zero `timeCost` and trigger effects are rejected on import.

## Scenario shape

A saved situation includes a versioned Studio envelope plus an ordinary engine `Scenario`.

| Field | Meaning |
|---|---|
| Situation | Title (≤60 characters), context (≤200), difficulty, mission sentence, and one of eight theme presets. |
| Measures | Exactly four measures, one per fixed role: Resources, Time, People, Progress. Each has a stable key, label, supported format, numeric domain, and higher-is-better flag. |
| Starting state | A finite initial value for every measure, inside its domain. |
| Decisions | Three reusable options, each with a title, description, and zero to four effects. The engine repeats this option set for its three stages. |
| Effect | Existing engine representation: measure key, signed delta, and a plain-text reason (≤120 characters). The engine records the actual clamped change and reason in its event history. |
| Base drift | Existing engine effects applied after each decision. The editor exposes one drift value per measure; an absent row means zero drift. |
| Threshold | Up to three engine rules, each using either strict `below` or inclusive `atMost`, with one to four effects and a short explanation. |
| Trigger | Existing event selection rule keyed by stage and option ID. It references a known event and explanation. It records event history; it does not alter option availability. |
| Outcomes | Engine order is Strong, Workable, Strained. Each label has a deterministic `minScore` threshold. At least one score weight must be positive. |
| Studio metadata | Theme, mission and stretch criteria, a three-option sample path, and optional original built-in ID. |

Formats currently accepted by the engine schema are rupees, lakhs, days, hours, points, percent, and count. Numeric values and deltas are limited to ±1,000,000. The scenario payload is limited to 20 KB; the saved library is limited to 20 situations total.

## Worked template

The default “Untitled situation” is a complete, editable example:

- **Situation:** “A short situation with limited resources and time.” Easy; generic theme. Objective: “Balance resources, time, people and progress.”
- **Measures:** Resources 60/100 points, Time 7/7 days, People 65/100 points, Progress 35/100 percent. Higher is better for each.
- **Base drift per stage:** Time −1 day, People −1 point, Progress +5 points; Resources has no base drift.
- **Stage 1, Stage 2, Stage 3:** each uses these same three engine choices, for nine stage/choice combinations:

| Choice at each stage | Resource effect | People effect | Progress effect |
|---|---:|---:|---:|
| Protect the plan | −8 | — | +12 |
| Reduce the scope | +8 | — | −3 |
| Ask for support | — | +6 | +5 |

Every effect has a specific recorded explanation. Each stage/choice pair has its own event entry, so the engine history identifies what happened. Threshold rules are initially empty; the deadline and ending events are handled by the existing engine. Outcomes are Strong ≥57, Workable ≥54, and Strained otherwise. The weights are Resources .25, Time .15, People .25, Progress .35. The sample path is protect, reduce, support. The template's deterministic balance report reaches all three outcomes across its 27 valid sequences.

## Balance checking

`checkBalance` calls the actual `newRun`, `optionsFor`, `applyDecision`, threshold logic, and outcome evaluation. For unconditional three-stage scenarios it explores 3³ = 27 decision sequences. When the engine makes an option unavailable, it explores only choices actually returned by `optionsFor`; paths are not merged or deduplicated, preserving different choice and trigger histories. The current engine has a finite three-stage horizon, so this search is exhaustive for all valid paths in that schema.

The report checks complete paths, stage/option/event/trigger/threshold reachability, final values against domains, non-negative Resources and Time, observed outcomes, and normalized score distribution. Median is the middle sorted score for odd counts or the mean of the two middle scores for even counts. The existing engine clamps a state change to a measure's declared domain; attempted crossings are reported as warnings and the checker evaluates the clamped state. A negative final resource/time value, no completed path, invalid schema, or unreachable required stage/option blocks play. Unobserved optional events, thresholds, triggers, or outcome bands remain warnings. Identical threshold predicates are flagged as potentially redundant.

“Go to field” changes to the relevant wizard step, focuses a matching control when one exists, and scrolls it into view inside the editor. A warning with no directly editable field focuses the closest supported decision/rule section.

## Variants and reward isolation

`Edit values` creates an `Edited` copy linked to the original. Reset field restores that exact original value; section reset restores the original section; reset entire variant creates a fresh clone of the original. Structural paths are used for equality, not rendered strings. `Custom`, `Edited`, `Draft`, and `Imported` items remain local and do not count toward the campaign's 18 stars or built-in unlocks.

Saved custom or edited runs are retained locally per situation. They use the app's existing result/branch engine but do not create campaign rewards. The Studio library supports edit, duplicate, delete with a six-second Undo, export, and play after eligibility checks.

## Import, export and sharing

JSON export is data-only with `schemaVersion: 1`, `scenarioType: "echoes-scenario"`, an engine scenario, and Studio metadata. Imports have a 64 KB input limit, are parsed as JSON, reject markup-like text and prototype-related keys, copy only recognized engine fields, validate references and limits, then create a new Imported ID. Pasted JSON and file import use the same path. Imported content is added as a draft and is never automatically run.

Share links gzip the same validated JSON into the URL fragment. The encoded fragment limit is 12 KB and decompressed data is capped at 20 KB while streaming. The browser must provide `CompressionStream`/`DecompressionStream`; if it does not, JSON export remains available. Clipboard denial or unsupported compression is surfaced as a readable error.

## Persistence and recovery

Studio data is stored under `echoes.studio.v1` (envelope version 1). Writes are debounced by the app. Load and save validate bounded JSON records and enforce the 20-item and 20 KB limits. Recognized version-zero `items` migrate to version one. Unknown or malformed versions are not overwritten. Malformed individual records are ignored with a notice. When localStorage is missing, disabled, denied, full, or throws, the Studio retains an in-memory copy for the session and reports that refresh persistence is unavailable.

## Themes

The procedural SVG preview accepts `stage`, `office`, `kitchen`, `hall`, `set`, `field`, `workshop`, and `generic`. It maps the four fixed measure roles into progress completion, people posture, a resource gauge, and a time dial. Values are normalized and clamped using the authored domains. The existing six built-in dioramas and persistent 3D Canvas are unchanged; the Studio preview is SVG and does not create another WebGL renderer.

## Known limitations

- The engine cannot provide stage-specific option menus or decision headlines, conditional next-decision triggers, or trigger-only numerical effects. These controls are deliberately not represented as working authoring features.
- The engine ignores the optional `timeCost` field; imports with a non-zero value are rejected.
- The current preview can execute the selected three-option sample path, but it is read-only and does not award stars, use tool charges, change branch history, or update campaign progress.
- The Studio's generic preview is a compact SVG model. It is not a new 3D custom-theme diorama.
- Compression-based sharing depends on modern browser stream APIs; JSON files provide the offline fallback.

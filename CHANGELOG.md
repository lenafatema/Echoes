# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-11T08:15:16+05:30 — Apply shared game color system

- Changed: Centralized the ECHOES palette in `src/tokens/colors.ts`, generated the CSS variables and style guide, applied surface-aware semantic colors across the interface and procedural scenes, and added palette/contrast/environment regression tests.
- Why: Keep the Midnight & Amber visual system consistent across the UI, HUD, Scenario Studio, and six scenario environments while preserving each scenario's identity.
- Validation: `npm run build` passed; `npm test` passed (63 tests); `npm run validate` passed for all six built-ins plus Studio fixtures; `npm run check:colors` and `npm run audit:colors` passed. The app loaded in the local in-app browser at `http://127.0.0.1:5190/` and exposed the campaign picker controls.
- Limitations: The build reports the existing large Three.js chunk warning. Browser verification here confirmed page load and accessible picker content; a complete visual review at every viewport was not performed.

```text
## <actual timestamp> — <short change title>

- Changed: <feature or files changed>
- Why: <reason for the change>
- Validation: <commands or manual checks actually run, with results>
- Limitations: <known issues or "None identified in these checks">
```

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.

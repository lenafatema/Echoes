# ECHOES

ECHOES is a local decision-simulation game for exploring how operational choices shape uncertain outcomes. Players manage six deterministic scenarios, inspect consequences, rewind decisions, compare recorded paths, and create or edit scenarios in the Scenario Studio.

## Run locally

Prerequisites: Node.js 22.6 or later and npm. No credentials, environment variables, network APIs, or database are required at runtime.

```sh
npm ci
npm run dev
```

Vite prints the local URL when the server starts. Production and validation checks:

```sh
npm run build
npm test
npm run validate
npm run check:colors
npm run audit:colors
```

Use `?lite=1` for the lower-cost 3D renderer or `?static=1` for the accessible static illustration mode. Both retain the simulation interactions.

## What is included

- Six deterministic scenarios, with branching, recorded consequences, rewind, replay and comparison.
- A persistent procedural Three.js Planning Room with an SVG/HTML fallback.
- Local campaign progression, scores, stars, ranks, achievements and run history.
- Scenario Studio for validated custom scenarios and built-in-derived variants.
- A centralized Midnight & Amber color system with semantic light/dark surfaces and scenario accents. See [the color style guide](docs/style-guide.md).

The simulation engine remains authoritative. Presentation effects do not change game outcomes.

## Project checks

- `npm run build` runs the TypeScript project build and Vite production build.
- `npm test` runs the deterministic engine, game, Studio, rendering-mode and palette tests.
- `npm run validate` enumerates scenario paths and validates outcomes, scoring and Studio balance.
- `npm run check:colors` rejects color literals outside the token source.
- `npm run audit:colors` checks source and built CSS against the palette.
- `npm run docs:colors` regenerates `src/tokens/colors.css` and `docs/style-guide.md` from `src/tokens/colors.ts`.

## Further documentation

- [Scenario Studio authoring and validation](docs/scenario-studio.md)
- [Game design and progression](docs/game-design.md)
- [Motion specification](docs/motion-spec.md)
- [Color style guide](docs/style-guide.md)

## Hackathon reference

This repository retains the organizer-provided [event rules](RULES.md), [agent guidance](AGENTS.md), [change log](CHANGELOG.md), [AI usage record](AI_USAGE.md), and [submission checklist](SUBMISSION.md). Confirm participant details and organizer submission requirements separately.

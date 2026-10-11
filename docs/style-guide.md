# ECHOES colour style guide

Generated from `src/tokens/colors.ts` by `npm run docs:colors`. CSS custom properties are generated from the same file.

## Token table

| Token | Value | Role | Tested contrast |
|---|---|---|---|
| neutrals · paper50 | `#F6EEDF` | Primary light text surface | ink on paper-50: 14.42:1; taupe-500 on paper-50: 4.89:1; Path B light on paper-50: 5.13:1; positive light on paper-50: 5.15:1; negative light on paper-50: 5.83:1; warning light on paper-50: 5.13:1; info light on paper-50: 5.50:1 |
| neutrals · paper100 | `#EFE4D0` | Light decision and form surface | ink on paper-100: 13.20:1; Path B light on paper-100: 4.70:1; positive light on paper-100: 4.71:1; negative light on paper-100: 5.34:1; warning light on paper-100: 4.70:1; info light on paper-100: 5.04:1 |
| neutrals · paper200 | `#E4D4B8` | Light hover and pressed surface | ink on paper-200: 11.41:1 |
| neutrals · sand300 | `#CDB894` | Neutral warm material and room detail | Shape only; do not use as small text |
| neutrals · taupe500 | `#7A634E` | Neutral secondary material | taupe-500 on paper-50: 4.89:1 |
| neutrals · umber600 | `#6A5240` | Neutral divider and raised material | Shape only; do not use as small text |
| neutrals · ink800 | `#2A1B11` | Primary text on light surfaces | ink on paper-50: 14.42:1; ink on paper-100: 13.20:1; ink on paper-200: 11.41:1 |
| neutrals · walnut800 | `#33231A` | Primary dark world surface | cream-100 on walnut-800: 11.03:1; cream-400 on walnut-800: 7.81:1; Path B dark on walnut-800: 6.57:1; positive dark on walnut-800: 8.33:1; negative dark on walnut-800: 7.33:1; warning dark on walnut-800: 7.56:1; info dark on walnut-800: 6.75:1; focus on walnut-800: 10.70:1 |
| neutrals · espresso900 | `#241810` | Deep dark surface | cream-100 on espresso-900: 12.69:1; cream-400 on espresso-900: 8.99:1; Path B dark on espresso-900: 7.56:1; positive dark on espresso-900: 9.59:1; negative dark on espresso-900: 8.44:1; warning dark on espresso-900: 8.70:1; info dark on espresso-900: 7.77:1; focus on espresso-900: 12.31:1 |
| neutrals · cream100 | `#EADBC0` | Primary text on dark surfaces | cream-100 on walnut-800: 11.03:1; cream-100 on espresso-900: 12.69:1 |
| neutrals · cream400 | `#C9B99C` | Secondary text on dark surfaces | cream-400 on walnut-800: 7.81:1; cream-400 on espresso-900: 8.99:1 |
| neutrals · taupe300 | `#A89A82` | Tertiary text on dark surfaces | Shape only; do not use as small text |
| reward · fill | `#B8862B` | Reward shapes only | Shape only; do not use as small text |
| reward · dark | `#E0B14A` | Stars, medals, gold rank and new-best emphasis | warning dark on walnut-800: 7.56:1; warning dark on espresso-900: 8.70:1 |
| path · aLight | `#2A1B11` | Path A on light | ink on paper-50: 14.42:1; ink on paper-100: 13.20:1; ink on paper-200: 11.41:1 |
| path · aDark | `#EADBC0` | Path A on dark | cream-100 on walnut-800: 11.03:1; cream-100 on espresso-900: 12.69:1 |
| path · bLight | `#8A5A12` | Path B on light | Path B light on paper-50: 5.13:1; Path B light on paper-100: 4.70:1; warning light on paper-50: 5.13:1; warning light on paper-100: 4.70:1 |
| path · bDark | `#D9A066` | Path B on dark | Path B dark on walnut-800: 6.57:1; Path B dark on espresso-900: 7.56:1 |
| status · positiveLight | `#566B2F` | Positive status on light | positive light on paper-50: 5.15:1; positive light on paper-100: 4.71:1 |
| status · positiveDark | `#B4C985` | Positive status on dark | positive dark on walnut-800: 8.33:1; positive dark on espresso-900: 9.59:1 |
| status · negativeLight | `#9A3F2D` | Negative status on light | negative light on paper-50: 5.83:1; negative light on paper-100: 5.34:1 |
| status · negativeDark | `#EBA48E` | Negative status on dark | negative dark on walnut-800: 7.33:1; negative dark on espresso-900: 8.44:1 |
| status · warningLight | `#8A5A12` | Warning on light | Path B light on paper-50: 5.13:1; Path B light on paper-100: 4.70:1; warning light on paper-50: 5.13:1; warning light on paper-100: 4.70:1 |
| status · warningDark | `#E0B14A` | Warning on dark | warning dark on walnut-800: 7.56:1; warning dark on espresso-900: 8.70:1 |
| status · infoLight | `#3F6479` | Info and foresight on light | info light on paper-50: 5.50:1; info light on paper-100: 5.04:1 |
| status · infoDark | `#8FB2CE` | Info and foresight on dark | info dark on walnut-800: 6.75:1; info dark on espresso-900: 7.77:1 |
| ranks · bronze | `#B87A45` | Large reward fills only, never text | Shape only; do not use as small text |
| ranks · silver | `#B9B2A6` | Rank shapes | Shape only; do not use as small text |
| ranks · gold | `#E0B14A` | Gold rank reward | warning dark on walnut-800: 7.56:1; warning dark on espresso-900: 8.70:1 |
| ranks · platinum | `#E6E1D8` | Platinum shape with ink label | Shape only; do not use as small text |
| focus | `#FFD477` | Visible keyboard focus | focus on walnut-800: 10.70:1; focus on espresso-900: 12.31:1 |
| scenarios · techFest · fill | `#4C5A8C` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · techFest · tint | `#9AA7D6` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · startup · fill | `#2F6B65` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · startup · tint | `#7FBDB5` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · restaurant · fill | `#A8482A` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · restaurant · tint | `#E0916F` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · flood · fill | `#466A85` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · flood · tint | `#8FB2CE` | Scenario identity accent or decorative material | info dark on walnut-800: 6.75:1; info dark on espresso-900: 7.77:1 |
| scenarios · film · fill | `#7A4F6B` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · film · tint | `#C79AB8` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · harvest · fill | `#5F6C26` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · harvest · tint | `#B5C46A` | Scenario identity accent or decorative material | Shape only; do not use as small text |
| scenarios · custom · fill | `#7A634E` | Scenario identity accent or decorative material | taupe-500 on paper-50: 4.89:1 |
| scenarios · custom · tint | `#C9B99C` | Scenario identity accent or decorative material | cream-400 on walnut-800: 7.81:1; cream-400 on espresso-900: 8.99:1 |
| Shadow | `Warm rgba token` | Low-opacity ambient/contact shadow | Non-text depth only |

### Tested text pairs

Every listed pair is tested at 4.5:1 or higher.

| Pair | Foreground on background | Ratio |
|---|---|---:|
| ink on paper-50 | #2A1B11 on #F6EEDF | 14.42:1 |
| ink on paper-100 | #2A1B11 on #EFE4D0 | 13.20:1 |
| ink on paper-200 | #2A1B11 on #E4D4B8 | 11.41:1 |
| taupe-500 on paper-50 | #7A634E on #F6EEDF | 4.89:1 |
| cream-100 on walnut-800 | #EADBC0 on #33231A | 11.03:1 |
| cream-100 on espresso-900 | #EADBC0 on #241810 | 12.69:1 |
| cream-400 on walnut-800 | #C9B99C on #33231A | 7.81:1 |
| cream-400 on espresso-900 | #C9B99C on #241810 | 8.99:1 |
| Path B light on paper-50 | #8A5A12 on #F6EEDF | 5.13:1 |
| Path B light on paper-100 | #8A5A12 on #EFE4D0 | 4.70:1 |
| Path B dark on walnut-800 | #D9A066 on #33231A | 6.57:1 |
| Path B dark on espresso-900 | #D9A066 on #241810 | 7.56:1 |
| positive light on paper-50 | #566B2F on #F6EEDF | 5.15:1 |
| positive light on paper-100 | #566B2F on #EFE4D0 | 4.71:1 |
| positive dark on walnut-800 | #B4C985 on #33231A | 8.33:1 |
| positive dark on espresso-900 | #B4C985 on #241810 | 9.59:1 |
| negative light on paper-50 | #9A3F2D on #F6EEDF | 5.83:1 |
| negative light on paper-100 | #9A3F2D on #EFE4D0 | 5.34:1 |
| negative dark on walnut-800 | #EBA48E on #33231A | 7.33:1 |
| negative dark on espresso-900 | #EBA48E on #241810 | 8.44:1 |
| warning light on paper-50 | #8A5A12 on #F6EEDF | 5.13:1 |
| warning light on paper-100 | #8A5A12 on #EFE4D0 | 4.70:1 |
| warning dark on walnut-800 | #E0B14A on #33231A | 7.56:1 |
| warning dark on espresso-900 | #E0B14A on #241810 | 8.70:1 |
| info light on paper-50 | #3F6479 on #F6EEDF | 5.50:1 |
| info light on paper-100 | #3F6479 on #EFE4D0 | 5.04:1 |
| info dark on walnut-800 | #8FB2CE on #33231A | 6.75:1 |
| info dark on espresso-900 | #8FB2CE on #241810 | 7.77:1 |
| focus on walnut-800 | #FFD477 on #33231A | 10.70:1 |
| focus on espresso-900 | #FFD477 on #241810 | 12.31:1 |

## Surface split

- Light reading and decision surfaces use paper-100, paper-50 for raised controls, and paper-200 for hover/pressed states.
- Dark world, HUD, consequence, result and comparison surfaces use walnut-800 and espresso-900.
- Add `data-surface="light"` or `data-surface="dark"` to a panel. Text, divider, path, status and accent semantics resolve from that surface automatically.
- Components use semantic variables such as `--text-primary`, `--divider`, `--path-b`, `--positive`, `--info`, and `--accent`; they do not embed palette values.

## Semantic map

| Semantic variable | Light surface | Dark surface |
|---|---|---|
| `--text-primary` | ink-800 | cream-100 |
| `--text-secondary` | umber-600 | cream-400 |
| `--text-tertiary` | taupe-500 | taupe-300 |
| `--divider` | paper-200 | umber-600 |
| `--surface-page` | paper-100 | walnut-800 |
| `--surface-raised` | paper-50 | espresso-900 |
| `--path-a` | ink-800 | cream-100 |
| `--path-b` | #8A5A12 | #D9A066 |
| `--positive` / `--negative` | status light values | status dark values |
| `--warning` / `--info` | status light values | status dark values |
| `--accent` | active scenario fill | active scenario fill |

## Scenario accents

| Scenario/theme | Fill | On-dark tint | Fill with paper-50 text | Tint on dark surfaces |
|---|---|---|---:|---:|
| techFest | `#4C5A8C` | `#9AA7D6` | 5.79:1 | 6.36:1 walnut; 7.31:1 espresso |
| startup | `#2F6B65` | `#7FBDB5` | 5.34:1 | 7.05:1 walnut; 8.12:1 espresso |
| restaurant | `#A8482A` | `#E0916F` | 5.02:1 | 6.05:1 walnut; 6.96:1 espresso |
| flood | `#466A85` | `#8FB2CE` | 4.98:1 | 6.75:1 walnut; 7.77:1 espresso |
| film | `#7A4F6B` | `#C79AB8` | 5.77:1 | 6.26:1 walnut; 7.21:1 espresso |
| harvest | `#5F6C26` | `#B5C46A` | 4.98:1 | 7.93:1 walnut; 9.12:1 espresso |
| custom | `#7A634E` | `#C9B99C` | 4.89:1 | 7.81:1 walnut; 8.99:1 espresso |

Built-in scenario IDs select one accent at a time. Custom and edited situations use taupe-500 / cream-400 unless their saved theme selects a preset. The active fill belongs only on the active diorama, its mission chip and Path B styling.

## Usage rules

- Keep approximately 70% neutral surfaces, 20% scenario accent, and 10% reward/status colour across the composition.
- Brass/reward fill is reserved for stars, medals, gold-rank shapes, and a real new-best moment. Bronze is for large reward fills and never for text.
- Pair gains and losses with a sign or arrow and an accessible text label.
- Path A is solid; Path B is dashed. Do not rely on colour alone.
- Warm shadows use the shared shadow token. 3D depth comes from warm lights and contact geometry, not glow.
- Three.js colours come from `colors.ts`; use Three.js colour management rather than hand-made RGB conversion.
- No pure black/white, gradients, neon, glow, blur or glass effects.

## Do and don't

| Do | Don't |
|---|---|
| Use `color: var(--text-primary)` in a surface-aware component. | Add a new hex literal to a component or stylesheet. |
| Use `--positive` with `▲ +` and `--negative` with `▼ −`. | Communicate a gain or loss by colour alone. |
| Use scenario fill on the active world, mission marker and alternate path. | Add the scenario accent to unrelated chrome. |
| Use reward tokens only when an earned reward is actually presented. | Use brass as a generic button, focus or decorative colour. |
| Run `npm run check:colors` and `npm run audit:colors`. | Add an exception without documenting why in the allowlist. |

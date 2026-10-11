import { mkdir, writeFile } from 'node:fs/promises';
import { colors, contrastPairs } from '../src/tokens/colors.ts';

const luminance = (hex:string) => {
  const rgb=[0,2,4].map(i=>parseInt(hex.slice(1).slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
};
const ratio=(a:string,b:string)=>{const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (high+.05)/(low+.05)};
const roleByPath:Record<string,string>={
  'neutrals.paper50':'Primary light text surface','neutrals.paper100':'Light decision and form surface','neutrals.paper200':'Light hover and pressed surface',
  'neutrals.sand300':'Neutral warm material and room detail','neutrals.taupe500':'Neutral secondary material','neutrals.umber600':'Neutral divider and raised material',
  'neutrals.ink800':'Primary text on light surfaces','neutrals.walnut800':'Primary dark world surface','neutrals.espresso900':'Deep dark surface',
  'neutrals.cream100':'Primary text on dark surfaces','neutrals.cream400':'Secondary text on dark surfaces','neutrals.taupe300':'Tertiary text on dark surfaces',
  'reward.fill':'Reward shapes only','reward.dark':'Stars, medals, gold rank and new-best emphasis',
  'path.aLight':'Path A on light','path.aDark':'Path A on dark','path.bLight':'Path B on light','path.bDark':'Path B on dark',
  'status.positiveLight':'Positive status on light','status.positiveDark':'Positive status on dark','status.negativeLight':'Negative status on light','status.negativeDark':'Negative status on dark',
  'status.warningLight':'Warning on light','status.warningDark':'Warning on dark','status.infoLight':'Info and foresight on light','status.infoDark':'Info and foresight on dark',
  'ranks.bronze':'Large reward fills only, never text','ranks.silver':'Rank shapes','ranks.gold':'Gold rank reward','ranks.platinum':'Platinum shape with ink label','focus':'Visible keyboard focus',
};
const rows:Array<[string,string,string,string]> = [];
function visit(value:unknown,path:string[]=[]){
  for(const [key,item] of Object.entries(value as Record<string,unknown>)){
    const next=[...path,key],id=next.join('.');
    if(typeof item==='string'&&/^#[\da-f]{6}$/i.test(item)){
      const matches=contrastPairs.filter(([,fg,bg])=>fg===item||bg===item).map(([label,fg,bg])=>`${label}: ${ratio(fg,bg).toFixed(2)}:1`);
      rows.push([next.join(' · '),item,roleByPath[id]||'Scenario identity accent or decorative material',matches.join('; ')||'Shape only; do not use as small text']);
    }else if(item&&typeof item==='object')visit(item,next);
  }
}
visit(colors);
rows.push(['Shadow','Warm rgba token','Low-opacity ambient/contact shadow','Non-text depth only']);
const table=rows.map(([name,value,role,contrast])=>`| ${name} | \`${value}\` | ${role} | ${contrast} |`).join('\n');
const pairs=contrastPairs.map(([name,fg,bg])=>`| ${name} | ${fg} on ${bg} | ${ratio(fg,bg).toFixed(2)}:1 |`).join('\n');
const scenarioRows=Object.entries(colors.scenarios).map(([name,pair])=>`| ${name} | \`${pair.fill}\` | \`${pair.tint}\` | ${ratio(pair.fill,colors.neutrals.paper50).toFixed(2)}:1 | ${ratio(pair.tint,colors.neutrals.walnut800).toFixed(2)}:1 walnut; ${ratio(pair.tint,colors.neutrals.espresso900).toFixed(2)}:1 espresso |`).join('\n');
const markdown=`# ECHOES colour style guide

Generated from \`src/tokens/colors.ts\` by \`npm run docs:colors\`. CSS custom properties are generated from the same file.

## Token table

| Token | Value | Role | Tested contrast |
|---|---|---|---|
${table}

### Tested text pairs

Every listed pair is tested at 4.5:1 or higher.

| Pair | Foreground on background | Ratio |
|---|---|---:|
${pairs}

## Surface split

- Light reading and decision surfaces use paper-100, paper-50 for raised controls, and paper-200 for hover/pressed states.
- Dark world, HUD, consequence, result and comparison surfaces use walnut-800 and espresso-900.
- Add \`data-surface="light"\` or \`data-surface="dark"\` to a panel. Text, divider, path, status and accent semantics resolve from that surface automatically.
- Components use semantic variables such as \`--text-primary\`, \`--divider\`, \`--path-b\`, \`--positive\`, \`--info\`, and \`--accent\`; they do not embed palette values.

## Semantic map

| Semantic variable | Light surface | Dark surface |
|---|---|---|
| \`--text-primary\` | ink-800 | cream-100 |
| \`--text-secondary\` | umber-600 | cream-400 |
| \`--text-tertiary\` | taupe-500 | taupe-300 |
| \`--divider\` | paper-200 | umber-600 |
| \`--surface-page\` | paper-100 | walnut-800 |
| \`--surface-raised\` | paper-50 | espresso-900 |
| \`--path-a\` | ink-800 | cream-100 |
| \`--path-b\` | ${colors.path.bLight} | ${colors.path.bDark} |
| \`--positive\` / \`--negative\` | status light values | status dark values |
| \`--warning\` / \`--info\` | status light values | status dark values |
| \`--accent\` | active scenario fill | active scenario fill |

## Scenario accents

| Scenario/theme | Fill | On-dark tint | Fill with paper-50 text | Tint on dark surfaces |
|---|---|---|---:|---:|
${scenarioRows}

Built-in scenario IDs select one accent at a time. Custom and edited situations use taupe-500 / cream-400 unless their saved theme selects a preset. The active fill belongs only on the active diorama, its mission chip and Path B styling.

## Usage rules

- Keep approximately 70% neutral surfaces, 20% scenario accent, and 10% reward/status colour across the composition.
- Brass/reward fill is reserved for stars, medals, gold-rank shapes, and a real new-best moment. Bronze is for large reward fills and never for text.
- Pair gains and losses with a sign or arrow and an accessible text label.
- Path A is solid; Path B is dashed. Do not rely on colour alone.
- Warm shadows use the shared shadow token. 3D depth comes from warm lights and contact geometry, not glow.
- Three.js colours come from \`colors.ts\`; use Three.js colour management rather than hand-made RGB conversion.
- No pure black/white, gradients, neon, glow, blur or glass effects.

## Do and don't

| Do | Don't |
|---|---|
| Use \`color: var(--text-primary)\` in a surface-aware component. | Add a new hex literal to a component or stylesheet. |
| Use \`--positive\` with \`▲ +\` and \`--negative\` with \`▼ −\`. | Communicate a gain or loss by colour alone. |
| Use scenario fill on the active world, mission marker and alternate path. | Add the scenario accent to unrelated chrome. |
| Use reward tokens only when an earned reward is actually presented. | Use brass as a generic button, focus or decorative colour. |
| Run \`npm run check:colors\` and \`npm run audit:colors\`. | Add an exception without documenting why in the allowlist. |
`;
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/style-guide.md',import.meta.url),markdown);
console.log('Generated docs/style-guide.md from src/tokens/colors.ts');

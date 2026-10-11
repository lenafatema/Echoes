import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { colors, contrastPairs, nonTextContrastPairs } from '../src/tokens/colors.ts';

function luminance(hex) {
  const raw=hex.replace('#','');
  const rgb=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function ratio(a,b){const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (high+.05)/(low+.05)}

test('all documented text token pairs meet WCAG AA 4.5:1',()=>{
  for(const [name,fg,bg] of contrastPairs)assert.ok(ratio(fg,bg)>=4.5,`${name}: ${ratio(fg,bg).toFixed(2)}:1`);
});

test('non-text indicators meet 3:1 contrast',()=>{
  for(const [name,fg,bg] of nonTextContrastPairs)assert.ok(ratio(fg,bg)>=3,`${name}: ${ratio(fg,bg).toFixed(2)}:1`);
});

test('every scenario fill and on-dark tint passes the requested contrast pairs',()=>{
  for(const [name,accent] of Object.entries(colors.scenarios)){
    assert.ok(ratio(accent.fill,colors.neutrals.paper50)>=4.5,`${name} fill on paper-50: ${ratio(accent.fill,colors.neutrals.paper50).toFixed(2)}:1`);
    for(const surface of ['walnut800','espresso900'])assert.ok(ratio(accent.tint,colors.neutrals[surface])>=4.5,`${name} tint on ${surface}: ${ratio(accent.tint,colors.neutrals[surface]).toFixed(2)}:1`);
  }
});

test('generated CSS custom properties remain at the reviewed token snapshot',()=>{
  const current=fs.readFileSync(new URL('../src/tokens/colors.css',import.meta.url),'utf8');
  const snapshot=fs.readFileSync(new URL('./snapshots/colors.css.snapshot',import.meta.url),'utf8');
  assert.equal(current,snapshot);
});

test('scenario accents inherit through light and dark surfaces instead of resetting to custom',()=>{
  const css=fs.readFileSync(new URL('../src/tokens/colors.css',import.meta.url),'utf8');
  const light=css.match(/\[data-surface="light"\]\s*\{([^}]*)\}/)?.[1]||'';
  const dark=css.match(/:root,\s*\[data-surface="dark"\]\s*\{([^}]*)\}/)?.[1]||'';
  assert.doesNotMatch(light,/--(?:accent|scenario-accent-fill|scenario-accent-tint)\s*:/);
  assert.doesNotMatch(dark,/--(?:accent|scenario-accent-fill|scenario-accent-tint)\s*:/);
  assert.match(css,/\[data-scenario="college-tech-fest"\][^{]*\{[^}]*--accent:\s*var\(--scenario-tech-fest-fill\)/);
});

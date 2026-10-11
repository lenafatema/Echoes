import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../src/scenarios/index.ts';
import { applyDecision, newRun, optionsFor, restoreRun, thresholdApplies } from '../src/engine/engine.ts';

test('each scenario completes valid deterministic paths with all outcomes',()=>{
  for(const scenario of scenarios){
    const outcomes=new Set();let count=0;const visit=run=>{
      for(const measure of scenario.measures){const [min,max]=measure.domain;assert.ok(run.state[measure.key]>=min&&run.state[measure.key]<=max,`${scenario.id}: ${measure.label} outside domain`);}
      if(run.status==='completed'){count++;outcomes.add(run.outcome);assert.equal(run.decisions.length,3);return}
      const choices=optionsFor(scenario,run);assert.ok(choices.length,`${scenario.id}: stuck before ending`);for(const option of choices)visit(applyDecision(scenario,run,option.id));
    };visit(newRun(scenario));assert.ok(count>0);assert.deepEqual([...outcomes].sort(),['strained','strong','workable']);
  }
});

test('tech fest sponsor withdrawal applies the ₹15,000 gap and supplier boundary is strict',()=>{
  const s=scenarios.find(item=>item.id==='college-tech-fest');const run=newRun(s);assert.equal(run.state.budget,35000);const threshold=s.thresholds.find(item=>item.id==='supplier-risk');assert.equal(thresholdApplies(48001,threshold),false);assert.equal(thresholdApplies(48000,threshold),false);assert.equal(thresholdApplies(47999,threshold),true);
});

test('rewinding restores real measures, decisions, events and fired-rule records',()=>{
 const s=scenarios[0];let run=newRun(s);const start={...run.state};const option=optionsFor(s,run)[0];run=applyDecision(s,run,option.id);const after={...run.state};const restored=restoreRun(run,0);assert.deepEqual(restored.state,start);assert.equal(restored.decisions.length,0);assert.equal(restored.events.length,1);assert.ok(restored.firedRules.length<run.firedRules.length);assert.notDeepEqual(after,start);
});

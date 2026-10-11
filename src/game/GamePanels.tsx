import { useEffect, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { Scenario } from '../scenarios/schema';
import { formatMeasure } from '../engine/engine';
import type { MissionConfig, ScoreResult, StarEvaluation } from './types';
import { motionTokens } from '../motion';

export function MissionBrief({scenario,mission,daily}:{scenario:Scenario;mission:MissionConfig;daily?:{date:string;modifier:{label:string}}|null}) {
  return <section className="mission-brief" aria-label="Mission objectives"><p className="eyebrow">{daily?`Daily challenge · ${daily.date}`:'Mission'}</p><h2>{mission.title}</h2><p>{mission.description}</p>{daily&&<p className="daily-modifier">Modifier: {daily.modifier.label}</p>}<div className="mission-thresholds"><div><strong>Mission star</strong>{mission.mission.map(c=>{const m=scenario.measures.find(item=>item.key===c.measure)!;return <span key={`mission-${c.measure}`}>{c.description} · starts {formatMeasure(scenario,c.measure,scenario.startingState[c.measure])}</span>})}</div><div><strong>Mastery star</strong>{mission.mastery.map(c=><span key={`mastery-${c.measure}`}>{c.description}</span>)}</div></div></section>;
}

export function GameResultPanel({scenario,mission,stars,score,personalBest,newBest,achievementMessages,reduced,decisionSummary,xpEarned,plannerLevel}:{scenario:Scenario;mission:MissionConfig;stars:StarEvaluation;score:ScoreResult;personalBest:number|null;newBest:boolean;achievementMessages:string[];reduced:boolean;decisionSummary?:{best:string|null;costliest:string|null;chains:string[]};xpEarned?:number;plannerLevel?:number}) {
  const rows=[['Completion',stars.completion],['Mission',stars.mission],['Mastery',stars.mastery]] as const;
  const scoreValue=useMotionValue(reduced?score.score:0);const roundedScore=useTransform(scoreValue,value=>Math.round(value));
  useEffect(()=>{if(reduced){scoreValue.set(score.score);return}scoreValue.set(0);const control=animate(scoreValue,score.score,{duration:motionTokens.consequence.counter,ease:[.22,1,.36,1]});return()=>control.stop()},[scoreValue,score.score,reduced]);
  return <section className="game-result" aria-label="Mission result">
    <p className="result-mission">{mission.title}</p><div className="game-result-head"><div><p className="eyebrow">Game result</p><strong className="game-score"><motion.span>{roundedScore}</motion.span><small> / 100</small></strong></div><div><strong className="game-rank">{score.rank}</strong>{score.nextRank&&<small>{score.nextRank} begins at {score.nextThreshold}</small>}</div></div>
    <div className="game-stars" aria-label={`${stars.count} of 3 stars earned`}>{rows.map(([name,result],index)=><div key={name} className={`game-star ${result.earned?'earned':'missed'}`} style={{animationDelay:reduced?'0ms':`${index*350}ms`}}><span aria-hidden="true">{result.earned?'★':'☆'}</span><div><strong>{name}</strong><small>{result.earned?'Earned':result.unmet.join(' · ')}</small></div></div>)}</div>
    <p className={`personal-best ${newBest?'new-best':''}`}>{newBest?'New personal best':personalBest!==null?`Personal best ${personalBest} · ties do not replace it`:'First recorded score'}</p>
    {decisionSummary&&<div className="decision-debrief"><p><strong>Best decision</strong>{decisionSummary.best||'No positive net change recorded'}</p><p><strong>Costliest decision</strong>{decisionSummary.costliest||'No adverse net change recorded'}</p>{decisionSummary.chains.length>0&&<p><strong>Chains</strong>{decisionSummary.chains.join(' · ')}</p>}</div>}
    {xpEarned!==undefined&&<p className="planner-xp-result">+{xpEarned} Planner XP · Level {plannerLevel||1}</p>}
    {achievementMessages.length>0&&<p className="achievement-feedback" aria-live="polite">New achievement · {achievementMessages.join(' · ')}</p>}
  </section>;
}

export function GameMissionHUD({scenario,mission,state,score,charges,children}:{scenario:Scenario;mission:MissionConfig;state:Record<string,number>;score:ScoreResult;charges:{foresight:number;rewind:number;advisor:number};children?:ReactNode}) {
  return <aside className="game-hud" aria-label="Mission HUD"><div className="game-hud-heading"><span>Mission progress</span><span>Score preview <strong>{score.score}</strong></span></div><div className="mission-progress-row">{mission.mission.map(c=>{const m=scenario.measures.find(item=>item.key===c.measure)!;return <span key={c.measure}>{m.label} <strong>{formatMeasure(scenario,m.key,state[m.key])}</strong> / {c.min!==undefined?formatMeasure(scenario,m.key,c.min):formatMeasure(scenario,m.key,c.max||0)}</span>})}</div><div className="game-tool-row"><span className="game-tool-label">Tools</span>{(['foresight','rewind','advisor'] as const).map(tool=><span className="game-tool-token" key={tool}><span className={`tool-token-shape ${tool}`} aria-hidden="true"/><span>{tool[0].toUpperCase()+tool.slice(1)} <strong>{charges[tool]}</strong></span></span>)}</div>{children}</aside>;
}

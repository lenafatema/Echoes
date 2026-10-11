import { useMemo, useState } from 'react';
import { formatMeasure } from '../engine/engine';
import { GenericDiorama } from './generic-diorama';
import { runSamplePath } from './defaults';
import type { StudioSituation } from './types';

export function StudioPreview({item,onSampleChange}:{item:StudioSituation;onSampleChange:(ids:[string,string,string])=>void}){
  const [open,setOpen]=useState(false);const run=useMemo(()=>{try{return runSamplePath(item)}catch{return null}},[item]);
  return <aside className="studio-preview" aria-label="Live simulation preview">
    <div className="studio-preview-head"><div><p className="eyebrow">Read-only engine preview</p><h2>{item.title||'Untitled situation'}</h2></div><button className="text-button studio-preview-toggle" onClick={()=>setOpen(x=>!x)} aria-expanded={open}>{open?'Hide preview':'Show preview'}</button></div>
    <div className={open?'studio-preview-body is-open':'studio-preview-body'}>
      <GenericDiorama scenario={item.scenario} state={run?.state||item.scenario.startingState} theme={item.metadata.theme}/>
      <div className="studio-preview-measures"><strong>Starting state</strong>{item.scenario.measures.map(m=><span key={m.key}><small>{m.label}</small><b>{formatMeasure(item.scenario,m.key,item.scenario.startingState[m.key])}</b></span>)}</div>
      <label className="studio-sample-path">Sample path
        {item.scenario.options.map((option,index)=><select key={index} aria-label={`Sample path decision ${index+1}`} value={item.metadata.samplePath[index]} onChange={e=>{const next:[string,string,string]=[...item.metadata.samplePath];next[index]=e.target.value;onSampleChange(next)}}>{item.scenario.options.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select>)}
      </label>
      <div className="studio-preview-measures studio-preview-final"><strong>Final state · real engine</strong>{item.scenario.measures.map(m=><span key={m.key}><small>{m.label}</small><b>{run?formatMeasure(item.scenario,m.key,run.state[m.key]):'Path unavailable'}</b></span>)}</div>
      {!run&&<p className="studio-inline-error" role="status">This sample path cannot be replayed with the current values.</p>}
      <p className="studio-preview-note">Preview runs a fresh copy of the existing deterministic engine. It does not touch your active run or campaign progress.</p>
    </div>
  </aside>;
}

import { colors } from '../tokens/colors';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RewardFeedback, RoomStats } from './types';
import { roomLandmarks } from './room-layout';
import type { LandmarkId } from './landmarks';
import { motionEasings, motionTokens } from '../motion';
import { unpresentedRewardFeedback } from '../game/reward-feedback';

const landmarkHitAreas: Record<LandmarkId, { size:[number,number,number]; offset:[number,number,number] }> = {
  'campaign-board': { size:[2.55,1.9,.55], offset:[0,0,.25] },
  'drawer-cabinet': { size:[1.55,1.7,1.25], offset:[0,.52,.38] },
  'drafting-desk': { size:[1.9,1.35,1.55], offset:[0,.43,0] },
  'medal-shelf': { size:[2.5,.9,.7], offset:[0,.3,.25] },
  ledger: { size:[1.65,.65,1.95], offset:[0,.1,.35] },
  radio: { size:[1.1,1.1,1.1], offset:[0,.38,0] },
};

function Landmark({id,position,active,children,onNavigate,reducedMotion}:{id:LandmarkId;position:[number,number,number];active:boolean;children:ReactNode;onNavigate:(id:LandmarkId)=>void;reducedMotion:boolean}){
  const group=useRef<THREE.Group>(null);const invalidate=useThree(state=>state.invalidate);const [hovered,setHovered]=useState(false);const raised=active||hovered;const hit=landmarkHitAreas[id];
  useEffect(()=>{if(!group.current)return;gsap.killTweensOf(group.current.position);if(reducedMotion){group.current.position.y=position[1]+(raised?.09:0);invalidate()}else gsap.to(group.current.position,{y:position[1]+(raised?.09:0),duration:motionTokens.duration.medium,ease:motionEasings.gsapEntrance,overwrite:true,onUpdate:invalidate});return()=>{if(group.current)gsap.killTweensOf(group.current.position)}},[raised,position,reducedMotion,invalidate]);
  return <group ref={group} position={position} userData={{landmark:id}}>
    {children}
    {raised&&<mesh position={[0,-.12,.22]}><torusGeometry args={[.36,.012,4,32]}/><meshStandardMaterial color={colors.status.infoDark} roughness={.9}/></mesh>}
    <mesh position={hit.offset} onClick={event=>{event.stopPropagation();onNavigate(id)}} onPointerOver={event=>{event.stopPropagation();setHovered(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHovered(false);document.body.style.cursor=''}}>
      <boxGeometry args={hit.size}/><meshBasicMaterial transparent opacity={0.001} colorWrite={false} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

export type { RoomStats } from './types';
function RewardMark({feedback,index,pulse,enabled}:{feedback:RewardFeedback;index:number;pulse:boolean;enabled:boolean}){
  const group=useRef<THREE.Group>(null);const invalidate=useThree(state=>state.invalidate);const x=(index-(3/2))*.42;
  useEffect(()=>{
    const node=group.current;if(!node)return;
    gsap.killTweensOf(node.position);gsap.killTweensOf(node.scale);
    if(!pulse||!enabled){node.position.set(x,.28,-3.25);node.scale.setScalar(1);invalidate();return;}
    node.position.set(x,.28,-3.25);node.scale.setScalar(.05);
    const timeline=gsap.timeline({delay:index*.12,onUpdate:invalidate});
    timeline.to(node.scale,{x:1,y:1,z:1,duration:.42,ease:motionEasings.gsapEntrance},0)
      .to(node.position,{y:.68,duration:.56,ease:motionEasings.gsapTravel},0);
    return()=>{timeline.kill()};
  },[feedback.id,pulse,enabled,index,x,invalidate]);
  const color=feedback.kind==='star'||feedback.kind==='personal-best'||feedback.kind==='achievement'?colors.reward.dark:feedback.kind==='rank'?colors.ranks.gold:colors.neutrals.paper50;
  return <group ref={group} position={[x,.28,-3.25]} scale={pulse&&enabled?.05:1}>
    {feedback.kind==='star'?<mesh><dodecahedronGeometry args={[.2,0]}/><meshStandardMaterial color={color} roughness={.76}/></mesh>:feedback.kind==='rank'?<mesh><boxGeometry args={[.44,.12,.32]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>:feedback.kind==='achievement'?<mesh><torusGeometry args={[.17,.055,6,18]}/><meshStandardMaterial color={color} roughness={.78}/></mesh>:<mesh><cylinderGeometry args={[.18,.18,.08,20]}/><meshStandardMaterial color={color} roughness={.78}/></mesh>}
  </group>;
}

function RewardStack({feedbacks,enabled}:{feedbacks:RewardFeedback[];enabled:boolean}){
  const firstRender=useRef(true);const [pulseIds,setPulseIds]=useState<string[]>([]);const signature=feedbacks.map(item=>item.id).join('|');
  useEffect(()=>{
    const ids=feedbacks.map(item=>item.id);
    if(firstRender.current){firstRender.current=false;return;}
    const prior=previousIds.current;const fresh=unpresentedRewardFeedback(prior,feedbacks).map(item=>item.id);
    previousIds.current=new Set(ids);
    if(!fresh.length)return;
    if(enabled)setPulseIds(fresh);
    const timer=window.setTimeout(()=>setPulseIds(current=>current.filter(id=>!fresh.includes(id))),1250);
    return()=>window.clearTimeout(timer);
  },[signature,enabled]);
  const previousIds=useRef(new Set(feedbacks.map(item=>item.id)));
  return <group>{feedbacks.slice(-4).map((item,index)=><RewardMark key={item.id} feedback={item} index={index} pulse={pulseIds.includes(item.id)} enabled={enabled}/>)}</group>;
}

export function PlanningRoom({stats,focusKey,onNavigate,rewardFeedback=[],rewardMotion=true,reducedMotion=false}:{stats:RoomStats;focusKey?:string;onNavigate:(id:LandmarkId)=>void;rewardFeedback?:RewardFeedback[];rewardMotion?:boolean;reducedMotion?:boolean}){
  const stars=Math.max(0,Math.min(18,stats.stars));
  const tableFinish=stats.tableFinish==='walnut'?colors.neutrals.umber600:colors.neutrals.taupe500;
  return <group>
    <mesh position={[0,-.43,0]} receiveShadow><boxGeometry args={[23,.12,20]}/><meshStandardMaterial color={colors.neutrals.espresso900} roughness={.96}/></mesh>
    <mesh position={[0,2.75,-8.48]}><boxGeometry args={[22,6.4,.2]}/><meshStandardMaterial color={colors.neutrals.espresso900} roughness={.98}/></mesh>
    <mesh position={[-11.4,2.3,-1.3]}><boxGeometry args={[.2,5.5,14.6]}/><meshStandardMaterial color={colors.neutrals.walnut800} roughness={.98}/></mesh>
    <mesh position={[11.4,2.3,-1.3]}><boxGeometry args={[.2,5.5,14.6]}/><meshStandardMaterial color={colors.neutrals.walnut800} roughness={.98}/></mesh>
    <mesh position={[0,-.26,0]} receiveShadow><boxGeometry args={[14.4,.22,9.4]}/><meshStandardMaterial color={tableFinish} roughness={.88}/></mesh>
    <mesh position={[0,-.125,0]}><boxGeometry args={[13.95,.04,8.98]}/><meshStandardMaterial color={colors.neutrals.walnut800} roughness={.93}/></mesh>
    {[-6.35,6.35].flatMap(x=>[-4,4].map(z=><mesh key={`leg-${x}-${z}`} position={[x,-.96,z]}><boxGeometry args={[.36,1.3,.36]}/><meshStandardMaterial color={colors.neutrals.umber600} roughness={.9}/></mesh>))}
    <mesh position={[0,-.104,0]}><boxGeometry args={[12.8,.025,7.9]}/><meshStandardMaterial color={colors.neutrals.walnut800} roughness={.92}/></mesh>
    <mesh position={[-6.55,2.05,-8.32]}><boxGeometry args={[2.25,1.55,.12]}/><meshStandardMaterial color={colors.neutrals.taupe500} roughness={.94}/></mesh>
    <mesh position={[-6.55,2.05,-8.24]}><boxGeometry args={[2.05,1.35,.035]}/><meshStandardMaterial color={colors.neutrals.paper50} roughness={1}/></mesh>
    <group position={[-7.25,0,1.7]}><mesh position={[0,.7,0]}><boxGeometry args={[1.05,1.35,.72]}/><meshStandardMaterial color={colors.neutrals.umber600} roughness={.92}/></mesh>{[.35,.72,1.08].map((y,i)=><group key={y}><mesh position={[0,y,.38]}><boxGeometry args={[.88,.06,.08]}/><meshStandardMaterial color={colors.neutrals.taupe500} roughness={.9}/></mesh>{i<Math.min(3,stats.situationCount)&&<mesh position={[0,y+.11,.42]}><boxGeometry args={[.54,.12,.025]}/><meshStandardMaterial color={colors.neutrals.paper50} roughness={1}/></mesh>}</group>)}</group>
    <group position={[6.7,0,1.5]}><mesh position={[0,.42,0]}><boxGeometry args={[1.55,.1,1.1]}/><meshStandardMaterial color={colors.neutrals.umber600} roughness={.88}/></mesh>{[-.58,.58].map(x=><mesh key={x} position={[x,.16,0]}><boxGeometry args={[.1,.42,.92]}/><meshStandardMaterial color={colors.neutrals.taupe500} roughness={.9}/></mesh>)}<mesh position={[0,.54,-.34]}><boxGeometry args={[.5,.46,.07]}/><meshStandardMaterial color={colors.status.infoDark} roughness={.95}/></mesh><mesh position={[0,.55,-.29]}><boxGeometry args={[.33,.045,.025]}/><meshStandardMaterial color={colors.neutrals.sand300} roughness={.9}/></mesh></group>
    <group position={[6.4,2,-8.3]}><mesh position={[0,0,0]}><boxGeometry args={[2,.1,.22]}/><meshStandardMaterial color={colors.neutrals.umber600} roughness={.9}/></mesh>{Array.from({length:Math.min(5,Math.max(1,stats.achievementCount))},(_,i)=><mesh key={i} position={[-.72+i*.36,.21,.02]}><cylinderGeometry args={[.105,.105,.08,12]}/><meshStandardMaterial color={stats.achievementCount?colors.reward.dark:colors.neutrals.taupe500} roughness={.8}/></mesh>)}</group>
    <group position={[-5.8,-.08,3.5]} rotation={[-.15,0,0]}><mesh><boxGeometry args={[1.25,.09,1.6]}/><meshStandardMaterial color={colors.neutrals.taupe500} roughness={.94}/></mesh><mesh position={[0,.055,0]}><boxGeometry args={[1.1,.018,1.42]}/><meshStandardMaterial color={colors.neutrals.paper50} roughness={1}/></mesh><mesh position={[0,.07,-.2]}><boxGeometry args={[.8,.008,.018]}/><meshStandardMaterial color={colors.status.infoDark}/></mesh>{Array.from({length:Math.min(5,stats.recordCount)},(_,i)=><mesh key={i} position={[-.35+i*.15,.08,.25]}><boxGeometry args={[.055,.01,.38]}/><meshStandardMaterial color={colors.neutrals.taupe500} roughness={.9}/></mesh>)}</group>
    <group position={[5.9,.01,3.6]}><mesh><cylinderGeometry args={[.27,.27,.12,20]}/><meshStandardMaterial color={colors.neutrals.umber600} roughness={.88}/></mesh><mesh position={[0,.14,0]}><cylinderGeometry args={[.2,.2,.12,20]}/><meshStandardMaterial color={colors.neutrals.sand300} roughness={.8}/></mesh><mesh position={[0,.28,0]}><torusGeometry args={[.055,.012,4,12]}/><meshStandardMaterial color={colors.neutrals.walnut800} roughness={.9}/></mesh></group>
    <group position={[-1.3,-.06,3.7]}><mesh position={[0,.12,0]}><cylinderGeometry args={[.16,.18,.24,16]}/><meshStandardMaterial color={colors.neutrals.paper50} roughness={.55}/></mesh><mesh position={[0,.25,0]}><torusGeometry args={[.1,.025,5,12]}/><meshStandardMaterial color={colors.neutrals.paper50} roughness={.6}/></mesh></group>
    <group position={[3.65,-.09,3.35]}><mesh position={[0,.35,0]}><cylinderGeometry args={[.045,.06,.7,8]}/><meshStandardMaterial color={colors.neutrals.umber600} roughness={.8}/></mesh><mesh position={[0,.72,0]}><coneGeometry args={[.24,.22,16]}/><meshStandardMaterial color={colors.neutrals.taupe500} roughness={.84}/></mesh></group>
    {roomLandmarks.map(item=><Landmark key={item.id} id={item.id} position={item.position} active={focusKey===`landmark:${item.id}`} onNavigate={onNavigate} reducedMotion={reducedMotion}><group/></Landmark>)}
    <RewardStack feedbacks={rewardFeedback} enabled={rewardMotion}/>
    {Array.from({length:Math.min(18,stars)},(_,i)=><mesh key={`star-${i}`} position={[-7.18+(i%6)*.25,2.63-Math.floor(i/6)*.28,-8.22]}><sphereGeometry args={[.055,8,6]}/><meshStandardMaterial color={colors.reward.dark} roughness={.82}/></mesh>)}
    {stats.stars===0&&<mesh position={[-7.18,2.64,-8.22]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color={colors.status.infoDark} roughness={.9}/></mesh>}
  </group>;
}

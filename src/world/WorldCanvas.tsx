import { colors } from '../tokens/colors';
import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Scenario } from '../scenarios/schema';
import type { Run } from '../engine/engine';
import type { TreeRun } from '../branch-tree/branchTreeAdapter';
import { WorldScene } from './WorldScene';
import type { LandmarkId } from '../environment/landmarks';
import type { RewardFeedback } from '../environment/types';
import { cameraPresetFor, motionTokens, screenDuration, skipCameraTimeline, travelCamera, SKIP_CAMERA_EVENT } from '../motion';
import type { ToolCharges } from '../game/types';
import { roomLightingFor } from '../environment/room-lighting';

export type WorldScreen = 'picker'|'intro'|'decision'|'consequence'|'result'|'compare'|'why'|'tree';
export type WorldMode = 'world'|'lite'|'static';
export interface WorldProps { scenarios:Scenario[]; scenario:Scenario|null; run:Run|null; scenarioTheme?:string; roomStats?:import('../environment/types').RoomStats; rewardFeedback?:RewardFeedback[]; cameraMovement?:number; presentationEventKey?:string|null; comparisonRuns?:{a:Run;b:Run}|null; treeRuns?:TreeRun[]; treeFocusId?:string; onTreeNodeSelect?:(nodeId:string)=>void; onCreateSituation?:()=>void; onNavigateRoom?:(id:LandmarkId)=>void; previewRoles?:import('../scenarios/schema').MeasureRole[]; toolCharges?:ToolCharges; focusedTool?:keyof ToolCharges|null; screen:WorldScreen; focusKey?:string; mode:WorldMode; onSelect:(s:Scenario)=>void; onFailure:(reason?:string)=>void; reducedMotion:boolean; hidden:boolean; onLowPerformance:()=>void; onCameraMoving:(moving:boolean)=>void; cameraMoving:boolean; }

const locations:[[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[-5.1,0,-1.4],[-3.5,0,2],[-1.7,0,4],[1.7,0,4],[3.5,0,2],[5.1,0,-1.4]];

function CameraDirector({scenarioIndex,screen,hasScenario,historyStep,focusKey,reducedMotion,mode,cameraMovement=1,onCameraMoving}:{scenarioIndex:number;screen:WorldScreen;hasScenario:boolean;historyStep:number;focusKey?:string;reducedMotion:boolean;mode:WorldMode;cameraMovement?:number;onCameraMoving:(moving:boolean)=>void}){
  const {camera,invalidate}=useThree(); const timeline=useRef<gsap.core.Timeline|null>(null); const last=useRef(''); const target=useRef(new THREE.Vector3(0,.25,0)); const destination=useRef<ReturnType<typeof cameraPresetFor>|null>(null); const lastLiteFrame=useRef(0);
  useEffect(()=>{
    const preset=cameraPresetFor(screen,scenarioIndex,hasScenario,focusKey,historyStep);
    const destinationKey=`${screen}:${scenarioIndex}:${hasScenario}:${['why','tree'].includes(screen)||screen==='picker'&&focusKey?.startsWith('landmark:')?focusKey||'':''}:${['decision','consequence'].includes(screen)?historyStep:''}`; if(last.current===destinationKey)return; last.current=destinationKey;
    destination.current=preset;
    timeline.current?.kill();
    const alreadyFramed=camera.position.distanceToSquared(new THREE.Vector3(...preset.position))<0.0001&&target.current.distanceToSquared(new THREE.Vector3(...preset.target))<0.0001;
    if(reducedMotion||cameraMovement<=0||alreadyFramed){camera.position.set(...preset.position);target.current.set(...preset.target);camera.lookAt(target.current);invalidate();onCameraMoving(false);return;}
    onCameraMoving(true);
    const duration=(screen==='picker'&&hasScenario?screenDuration.picker:screenDuration[screen])*Math.max(.35,1.4-cameraMovement);
    const travel=travelCamera(camera,target.current,preset,duration,()=>{const now=performance.now();if(mode!=='lite'||now-lastLiteFrame.current>=1000/motionTokens.performance.liteFps){lastLiteFrame.current=now;invalidate()}},()=>{invalidate();onCameraMoving(false)});
    timeline.current=travel.timeline;
    const skip=()=>{if(destination.current)skipCameraTimeline(timeline.current,camera,target.current,destination.current);onCameraMoving(false);invalidate()};
    window.addEventListener(SKIP_CAMERA_EVENT,skip);
    return()=>{window.removeEventListener(SKIP_CAMERA_EVENT,skip);timeline.current?.kill();onCameraMoving(false);};
  },[camera,invalidate,scenarioIndex,screen,hasScenario,historyStep,focusKey,reducedMotion,mode,cameraMovement,onCameraMoving]);
  return null;
}

function PerformanceWatch({onLowPerformance,mode}:{onLowPerformance:()=>void;mode:WorldMode}){
  const elapsed=useRef(0);const frames=useRef(0);const low=useRef(0);const sent=useRef(false);
  useFrame((_,delta)=>{if(mode!=='world'||sent.current)return;elapsed.current+=delta;frames.current++;if(elapsed.current>=2){if(frames.current/elapsed.current<24)low.current++;else low.current=0;if(low.current>=1){sent.current=true;onLowPerformance()}elapsed.current=0;frames.current=0;}});
  return null;
}

function SceneContents(props:WorldProps){
  const scenarioIndex=props.scenario?props.scenarios.findIndex(s=>s.id===props.scenario?.id):0;
  const lighting=roomLightingFor(props.scenario,props.run?.state||props.scenario?.startingState||null);
  return <>
    <PerspectiveCamera makeDefault position={[0,8.5,14]} fov={38}/>
    <CameraDirector scenarioIndex={Math.max(0,scenarioIndex)} screen={props.screen} hasScenario={!!props.scenario} historyStep={props.run?.decisions.length||0} focusKey={props.focusKey} reducedMotion={props.reducedMotion} mode={props.mode} cameraMovement={props.cameraMovement} onCameraMoving={props.onCameraMoving}/><PerformanceWatch mode={props.mode} onLowPerformance={props.onLowPerformance}/>
    <WebGLContextGuard onFailure={props.onFailure}/>
    <ambientLight color={colors.neutrals.cream400} intensity={.72}/><directionalLight position={[-4,8,6]} intensity={1.22} color={colors.neutrals.cream100}/><pointLight position={[5.4,2.8,2.6]} intensity={Math.min(.42,lighting.lampIntensity*.72+Math.max(0,Math.min(18,props.roomStats?.stars||0))/18*.08)} color={props.roomStats?.lampTone==='amber'?colors.neutrals.sand300:lighting.lampTint} distance={14} decay={2}/>
    <color attach="background" args={[colors.neutrals.espresso900]}/>
    <fog attach="fog" args={[colors.neutrals.espresso900,15,38]}/>
    <WorldScene {...props} onSelect={props.onSelect}/>
  </>;
}

function WebGLContextGuard({onFailure}:{onFailure:(reason?:string)=>void}){
  const gl=useThree(state=>state.gl);const failure=useRef(onFailure);failure.current=onFailure;
  useEffect(()=>{
    const canvas=gl.domElement;
    const lost=(event:Event)=>{event.preventDefault();failure.current('The browser lost the WebGL context. Use Retry 3D to attempt recovery; the illustrated game remains available.')};
    canvas.addEventListener('webglcontextlost',lost);
    return()=>canvas.removeEventListener('webglcontextlost',lost);
  },[gl]);
  return null;
}

export function WorldCanvas(props:WorldProps){
  // The Canvas remains mounted while the screen and simulation state change.
  if(props.mode==='static')return null;
  const createRenderer=(canvas:HTMLCanvasElement|OffscreenCanvas)=>{
    try{
      return new THREE.WebGLRenderer({
        canvas,
        antialias:props.mode!=='lite',
        alpha:false,
        powerPreference:'high-performance',
      });
    }catch(error){
      const detail=error instanceof Error?error.message:String(error);
      props.onFailure(`WebGL renderer initialization failed: ${detail}`);
      throw error;
    }
  };
  return <WorldErrorBoundary onFailure={props.onFailure}><div className={`world-canvas ${props.mode==='lite'?'world-lite':''}`} aria-hidden="true">
    <Canvas dpr={props.mode==='lite'?[motionTokens.performance.liteDpr,motionTokens.performance.liteDpr]:[1,Math.min(window.innerWidth<760?motionTokens.performance.mobileDpr:motionTokens.performance.desktopDpr,window.devicePixelRatio||1)]} frameloop={props.hidden?'never':props.mode==='lite'?'demand':props.cameraMoving?'always':'demand'} shadows={false} gl={createRenderer} fallback="WebGL is unavailable. The illustrated game remains accessible." >
      <Suspense fallback={null}><SceneContents {...props}/></Suspense>
    </Canvas>
  </div></WorldErrorBoundary>;
}

class WorldErrorBoundary extends Component<{children:ReactNode;onFailure:(reason?:string)=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error:Error){this.props.onFailure(`The 3D room stopped while rendering: ${error.message}`)}
  render(){return this.state.failed?null:this.props.children}
}

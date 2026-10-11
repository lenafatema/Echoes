import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { scenarios } from './scenarios';
import type { Scenario } from './scenarios/schema';
import { applyDecision, formatMeasure, matchesScenarioRun, newRun, optionsFor, restoreRun, type PathId, type Run } from './engine/engine';
import { ScenarioPicker } from './screens/ScenarioPicker';
import { CompareScreen, ConsequenceScreen, DecisionScreen, IntroScreen, ResultScreen, WhyOverlay } from './screens/ScenarioScreens';
import { BranchTreeScreen } from './screens/BranchTreeScreen';
import { branchTreeFor, type TreeRun } from './branch-tree/branchTreeAdapter';
import type { MeasureRole } from './scenarios/schema';
import { motionEasings, motionTokens, screenDuration, screenVariants, reducedScreenVariants, SKIP_UI_EVENT, skipCurrentAnimation, shouldUseReducedMotion } from './motion';
import { STARTING_CHARGES, advisorFor, applyChallenge, awardCompletedRun, consumeTool, dailyChallengeFor, evaluateStars, isScenarioUnlocked, loadProgress, makeRunSession, missionFor, mostDistinctAlternative, newRunKey, recordCompletedRun, replayRecord, rewindLatestDecision, reconcileProgress, retainSessions, saveProgress, scorePreview, scoreRun, spendCharge, type AdvisorName, type DailyChallenge, type GameProgress, type MissionConfig, type RunSession } from './game';
import { GameResultPanel } from './game/GamePanels';
import { playGameSound } from './game/audio';
import { ScenarioStudio } from './studio/scenario-studio';
import { beginCustom, beginVariant, deleteSituation, playable, restoreAtIndex } from './studio/draft-store';
import { defaultRuntimeMission } from './studio/defaults';
import { loadStudioStorage, saveStudioStorage, type StudioLoadResult } from './studio/storage';
import { checkBalance } from './studio/balance-checker';
import type { StudioSituation, StudioState } from './studio/types';
import { MAX_SITUATIONS } from './studio/schema';
import { campaignStars } from './game/campaign';
import { bestAndCostliestDecision } from './effects/decision-impact';
import { totalPlannerXp, plannerLevel, xpForRecord } from './effects/xp';
import { effectSequencer } from './effects/effect-sequencer';
import { presentationEventsFor } from './effects/event-adapter';
import { effectiveEffectMode, loadEffectPreferences, saveEffectPreferences, type EffectMode, type EffectPreferences } from './effects/settings';
import { configureAudio } from './audio/audio-engine';
import { roomLandmarks } from './environment/room-layout';
import type { RewardFeedback } from './environment/types';
import type { LandmarkId } from './environment/landmarks';
import { destinationForLandmark, pickerDetailsIndexForLandmark } from './environment/navigation';
import { resolveWorldRenderMode, worldFallbackReason } from './world/render-mode';
import type { WorldMode } from './world/WorldCanvas';
import { rewardFeedbackForCompletion } from './game/reward-feedback';
import type { PresentationEvent } from './effects/types';
import { chainCount as chainCountForResult } from './effects/chain';
const WorldCanvas = lazy(() => import('./world/WorldCanvas').then(m => ({ default: m.WorldCanvas })));

type Screen = 'picker'|'intro'|'decision'|'consequence'|'result'|'compare'|'tree';
type Persisted = Record<string,{branches:Run[];active:PathId;archive?:Run[];branchRunKeys?:Partial<Record<PathId,string>>;archiveRunKeys?:string[]}>;
const SAVE = 'echoes-multiscenario-save-v1';
function readSave(catalog:Scenario[]=scenarios): Persisted {
  try {
    const parsed=JSON.parse(localStorage.getItem(SAVE)||'{}');
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
    const clean:Persisted={};
    for(const scenario of catalog){const entry=parsed[scenario.id];if(entry&&Array.isArray(entry.branches)){
      const valid=(run:any)=>{
        const validState=(state:any)=>!!state&&scenario.measures.every(measure=>Number.isFinite(state[measure.key])&&state[measure.key]>=measure.domain[0]&&state[measure.key]<=measure.domain[1]);
        const validEvents=(events:any[])=>events.every(item=>item&&typeof item.id==='string'&&scenario.events.some(event=>event.id===item.eventId)&&Number.isInteger(item.step)&&typeof item.title==='string'&&Array.isArray(item.changes)&&item.changes.every((change:any)=>scenario.measures.some(measure=>measure.key===change.measure)&&Number.isFinite(change.before)&&Number.isFinite(change.after)&&Number.isFinite(change.delta)&&typeof change.reason==='string'));
        return run&&run.scenarioId===scenario.id&&['A','B'].includes(run.id)&&validState(run.state)&&Number.isInteger(run.day)&&run.day>=1&&['active','completed'].includes(run.status)&&[null,'strong','workable','strained'].includes(run.outcome)&&Array.isArray(run.decisions)&&run.decisions.every((id:string)=>scenario.options.some(option=>option.id===id))&&validEvents(run.events)&&Array.isArray(run.history)&&run.history.length>0&&run.history.every((snapshot:any)=>snapshot&&validState(snapshot.state)&&Number.isInteger(snapshot.day)&&Number.isInteger(snapshot.eventCount)&&snapshot.eventCount>=0&&snapshot.eventCount<=run.events.length&&Number.isInteger(snapshot.decisionCount)&&snapshot.decisionCount>=0&&snapshot.decisionCount<=run.decisions.length&&Number.isInteger(snapshot.firedCount)&&snapshot.firedCount>=0)&&Array.isArray(run.firedRules)&&run.firedRules.every((rule:string)=>typeof rule==='string');
      };
      const branches:Run[]=entry.branches.filter(valid) as Run[];const archived=(Array.isArray(entry.archive)?entry.archive:[]).map((run:any,index:number)=>({run,key:Array.isArray(entry.archiveRunKeys)&&typeof entry.archiveRunKeys[index]==='string'?entry.archiveRunKeys[index]:undefined})).filter((item:{run:any})=>valid(item.run));const archive=archived.map((item:{run:Run})=>item.run);
      const branchRunKeys:Partial<Record<PathId,string>>={};for(const run of branches){const key=entry.branchRunKeys?.[run.id];if(typeof key==='string')branchRunKeys[run.id]=key;else branchRunKeys[run.id]=`${scenario.id}:${run.id}`;}
      clean[scenario.id]={branches,archive,archiveRunKeys:archived.map((item:{key?:string},index:number)=>item.key||`legacy-archive-${scenario.id}-${index}`),branchRunKeys,active:entry.active==='B'&&branches.some((b:Run)=>b.id==='B')?'B':'A'};
    }}
    return clean;
  } catch { return {}; }
}
const challengeScenario=(base:Scenario,challenge:DailyChallenge|null)=>challenge?applyChallenge(base,challenge):base;

export default function App(){
  const shellRef=useRef<HTMLDivElement|null>(null);
  const [initialStudio]=useState<StudioLoadResult>(()=>loadStudioStorage());
  const [studioState,setStudioState]=useState<StudioState>(()=>initialStudio.state);
  const studioStateRef=useRef(studioState);studioStateRef.current=studioState;
  const [studioOpen,setStudioOpen]=useState(false);
  const studioOpenRef=useRef(false);studioOpenRef.current=studioOpen;
  const [studioUndo,setStudioUndo]=useState<{item:StudioSituation;index:number;draft:StudioState['draft']}|null>(null);
  const studioUndoTimer=useRef<number|undefined>();
  const [screen,setScreen]=useState<Screen>('picker');
  const screenRef=useRef<Screen>('picker');screenRef.current=screen;
  const [scenario,setScenario]=useState<Scenario|null>(null);
  const [saved,setSaved]=useState<Persisted>(()=>readSave([...scenarios,...initialStudio.state.situations.filter(item=>!item.draft).map(item=>item.scenario)]));
  const [gameProgress,setGameProgress]=useState<GameProgress>(()=>reconcileProgress(loadProgress(),scenarios));
  const [step,setStep]=useState<number|null>(null);
  const [direction,setDirection]=useState(1);
  const [why,setWhy]=useState(false);
  const [skip,setSkip]=useState(false);
  const [skipMotion,setSkipMotion]=useState(false);
  const [selectedTile,setSelectedTile]=useState<string|null>(null);
  const [pickerFocus,setPickerFocus]=useState<string|null>(null);
  const [announcement,setAnnouncement]=useState('Choose a situation');
  const [previewRoles,setPreviewRoles]=useState<MeasureRole[]>([]);
  const [foresightActive,setForesightActive]=useState(false);
  const [treeFocusId,setTreeFocusId]=useState('');
  const [freePlay,setFreePlay]=useState(false);
  const [pendingDaily,setPendingDaily]=useState<DailyChallenge|null>(null);
  const [tutorialStep,setTutorialStep]=useState<'decision'|'foresight'|'rewind'|null>(null);
  const [tutorialHelp,setTutorialHelp]=useState(false);
  const [motionOverride,setMotionOverride]=useState<boolean|null>(null);
  const [worldFailed,setWorldFailed]=useState(false);
  const [worldFailureReason,setWorldFailureReason]=useState<string|null>(null);
  const [rewardFeedback,setRewardFeedback]=useState<RewardFeedback[]>([]);
  const [slowWorld,setSlowWorld]=useState(false);
  const [hidden,setHidden]=useState(document.hidden);
  const [cameraMoving,setCameraMoving]=useState(false);
  const [newBestRunId,setNewBestRunId]=useState<string|null>(null);
  const [newAchievementRunId,setNewAchievementRunId]=useState<string|null>(null);
  const [storageWarning,setStorageWarning]=useState(false);
  const [roomMenuOpen,setRoomMenuOpen]=useState(false);
  const [roomFocus,setRoomFocus]=useState<string|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [pauseOpen,setPauseOpen]=useState(false);
  const [effectPreferences,setEffectPreferences]=useState<EffectPreferences>(()=>loadEffectPreferences());
  const [latestPresentation,setLatestPresentation]=useState<PresentationEvent|null>(null);
  const [stinger,setStinger]=useState<PresentationEvent|null>(null);
  const [shakeActive,setShakeActive]=useState(false);
  const [booting,setBooting]=useState(()=>{try{return !sessionStorage.getItem('echoes.room.booted.v1')&&new URLSearchParams(location.search).get('static')!=='1'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}});
  const bootTimer=useRef<number|undefined>();
  const stingerTimer=useRef<number|undefined>();
  const shakeTimer=useRef<number|undefined>();
  const toolLock=useRef(false);
  const systemReduced=useReducedMotion();
  const params=new URLSearchParams(window.location.search);
  const forcedStatic=params.get('static')==='1';
  const requestedLite=params.get('lite')==='1';
  const effectMode=effectiveEffectMode(effectPreferences.mode,systemReduced??shouldUseReducedMotion(),forcedStatic);
  const reduced=motionOverride??((systemReduced??shouldUseReducedMotion())||effectMode!=='full');
  const lowPower=typeof navigator!=='undefined'&&navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<4||typeof window!=='undefined'&&window.matchMedia('(pointer: coarse)').matches;
  const mode:WorldMode=resolveWorldRenderMode({forcedStatic,worldFailed,requestedLite,slowWorld,lowPower,reducedMotion:reduced});
  const studioItem=scenario?studioState.situations.find(item=>item.id===scenario.id):undefined;
  const builtIn=!!scenario&&scenarios.some(item=>item.id===scenario.id);

  useEffect(()=>{const change=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[]);
  useEffect(()=>{saveEffectPreferences(effectPreferences)},[effectPreferences]);
  useEffect(()=>{configureAudio(gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume,!hidden,false)},[gameProgress.soundEnabled,effectMode,effectPreferences.volume,hidden]);
  useEffect(()=>{
    if(!booting)return;
    bootTimer.current=window.setTimeout(()=>{setBooting(false);try{sessionStorage.setItem('echoes.room.booted.v1','1')}catch{}},900);
    return()=>window.clearTimeout(bootTimer.current);
  },[booting]);
  useEffect(()=>{const remove=effectSequencer.subscribe(event=>{setLatestPresentation(event);if(event.type==='stinger'){setStinger(event);window.clearTimeout(stingerTimer.current);stingerTimer.current=window.setTimeout(()=>setStinger(null),600)}});return()=>{remove();window.clearTimeout(stingerTimer.current)}},[]);
  useEffect(()=>()=>{window.clearTimeout(bootTimer.current);window.clearTimeout(stingerTimer.current);window.clearTimeout(shakeTimer.current)},[]);
  useEffect(()=>{if(!roomFocus||!roomFocus.startsWith('landmark:')||screen!=='picker'||studioOpen)return;const id=roomFocus.slice('landmark:'.length) as LandmarkId;const index=pickerDetailsIndexForLandmark(id);if(index===null)return;const timer=window.setTimeout(()=>{const items=shellRef.current?.querySelectorAll<HTMLDetailsElement>('.campaign-records details');const item=items?.[index];if(item){item.open=true;item.scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'})}},150);return()=>window.clearTimeout(timer)},[roomFocus,screen,studioOpen,reduced]);
  useEffect(()=>{
    const shell=shellRef.current;if(!shell)return;
    const activeScroller=(x:number)=>{
      if(studioOpenRef.current){const studio=shell.querySelector<HTMLElement>('.library-studio');const form=studio?.querySelector<HTMLElement>(x>window.innerWidth*.55?'.studio-preview-column':'.studio-form');return form||studio;}
      return shell.querySelector<HTMLElement>(`.library-main.library-${screenRef.current}`);
    };
    const canScroll=(element:HTMLElement|null)=>!!element&&element.scrollHeight>element.clientHeight+1;
    const scroll=(delta:number,x:number)=>{const element=activeScroller(x);if(!canScroll(element))return false;element!.scrollTop=Math.max(0,Math.min(element!.scrollHeight-element!.clientHeight,element!.scrollTop+delta));return true;};
    const wheel=(event:WheelEvent)=>{if(event.ctrlKey||Math.abs(event.deltaY)<1)return;const target=event.target as HTMLElement|null;if(target?.closest('.why-overlay,.game-modal,.studio-form,.studio-preview-column'))return;if(scroll(event.deltaY,event.clientX)){event.preventDefault();event.stopPropagation();}};
    let touch:{x:number;y:number}|null=null;
    const touchStart=(event:TouchEvent)=>{const point=event.touches[0];touch=point?{x:point.clientX,y:point.clientY}:null;};
    const touchMove=(event:TouchEvent)=>{const point=event.touches[0];if(!point||!touch)return;const dx=point.clientX-touch.x,dy=point.clientY-touch.y;if(Math.abs(dy)<=Math.abs(dx))return;const target=event.target as HTMLElement|null;if(target?.closest('.why-overlay,.game-modal,.studio-form,.studio-preview-column'))return;if(scroll(-dy,point.clientX)){touch={x:point.clientX,y:point.clientY};event.preventDefault();event.stopPropagation();}};
    const touchEnd=()=>{touch=null;};
    shell.addEventListener('wheel',wheel,{capture:true,passive:false});shell.addEventListener('touchstart',touchStart,{capture:true,passive:true});shell.addEventListener('touchmove',touchMove,{capture:true,passive:false});shell.addEventListener('touchend',touchEnd,{capture:true,passive:true});shell.addEventListener('touchcancel',touchEnd,{capture:true,passive:true});
    return()=>{shell.removeEventListener('wheel',wheel,true);shell.removeEventListener('touchstart',touchStart,true);shell.removeEventListener('touchmove',touchMove,true);shell.removeEventListener('touchend',touchEnd,true);shell.removeEventListener('touchcancel',touchEnd,true);};
  },[]);
  useEffect(()=>{const ok=saveProgress(gameProgress);if(!ok&&!storageWarning){setStorageWarning(true);setAnnouncement('Local storage is unavailable; game progression is kept in memory for this session.')}},[gameProgress,storageWarning]);
  useEffect(()=>{if(initialStudio.warning)setAnnouncement(initialStudio.warning)},[initialStudio]);
  useEffect(()=>()=>window.clearTimeout(studioUndoTimer.current),[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{const ok=saveStudioStorage(studioState);if(!ok&&studioState.situations.length){setStorageWarning(true);setAnnouncement('Studio storage is unavailable or full; changes remain in memory for this session.')}},250);return()=>window.clearTimeout(timer)},[studioState]);
  useEffect(()=>{let timer=0;const finish=()=>{setSkipMotion(true);window.clearTimeout(timer);timer=window.setTimeout(()=>setSkipMotion(false),120)};window.addEventListener(SKIP_UI_EVENT,finish);return()=>{window.removeEventListener(SKIP_UI_EVENT,finish);window.clearTimeout(timer)}},[]);
  useEffect(()=>{const skipMotion=(event:PointerEvent)=>{const target=event.target as HTMLElement;if(target.closest('button,input,a,[role="slider"]'))return;if(cameraMoving)skipCurrentAnimation();if(screen==='consequence'&&!skip)setSkip(true)};document.addEventListener('pointerdown',skipMotion);return()=>document.removeEventListener('pointerdown',skipMotion)},[cameraMoving,screen,skip]);

  const entry=scenario?saved[scenario.id]:undefined;
  const activeId=entry?.active||'A';
  const branch=entry?.branches.find(b=>b.id===activeId);
  const activeStep=branch?(step===null?branch.history.length-1:Math.max(0,Math.min(step,branch.history.length-1))):0;
  const view=branch?restoreRun(branch,activeStep):undefined;
  const pathA=entry?.branches.find(b=>b.id==='A');
  const pathB=entry?.branches.find(b=>b.id==='B');
  const progressKey=scenario?(entry?.branchRunKeys?.[activeId]||`${scenario.id}:${activeId}`):'';
  const defaultSession=scenario?makeRunSession(progressKey,scenario.startingState,null):null;
  const session=scenario?(gameProgress.sessions[progressKey]||defaultSession):null;
  const mission:MissionConfig|undefined=scenario?(missionFor(scenario.id)||(studioItem?defaultRuntimeMission(studioItem):undefined)):undefined;
  const score= scenario&&view&&mission?scorePreview(scenario,view.state,mission,session?.charges||STARTING_CHARGES):null;
  const currentStarEvaluation=scenario&&view&&mission?evaluateStars(scenario,view.state,view.decisions.length,view.status==='completed',mission):null;
  const resultScore=scenario&&view&&mission&&session?scoreRun(scenario,view.state,mission,{stars:currentStarEvaluation?.count||0,charges:session.charges,completed:view.status==='completed',decisions:view.decisions.length}):null;
  const treePaths=useMemo<TreeRun[]>(()=>entry?[...entry.branches.map(run=>({key:`branch:${run.id}`,label:`Path ${run.id}`,run})),...(entry.archive||[]).map((run,index)=>({key:`archive:${index}`,label:`Archived Path ${run.id} · ${index+1}`,run,archived:true}))]:[],[entry]);
  const treeNodes=useMemo(()=>scenario?branchTreeFor(scenario,treePaths):[],[scenario,treePaths]);
  const completed=Object.keys(gameProgress.bestStars).filter(id=>(gameProgress.bestStars[id]||0)>0);
  const plannerXp=totalPlannerXp(gameProgress.runs,gameProgress.achievements);
  const plannerProgress=plannerLevel(plannerXp);
  const roomStats={stars:campaignStars(gameProgress.bestStars),achievementCount:gameProgress.achievements.length,recordCount:gameProgress.runs.length,situationCount:studioState.situations.filter(item=>!item.draft).length,tableFinish:effectPreferences.tableFinish,lampTone:effectPreferences.lampTone};

  // Each state transition starts at the top of its new reading pane. This keeps
  // old scroll offsets from hiding a new headline under the top bar/tutorial.
  useLayoutEffect(()=>{
    const shell=shellRef.current;
    if(!shell)return;
    shell.querySelectorAll<HTMLElement>('.library-main,.decision-copy,.consequence-main,.result-copy-block,.compare-lib,.why-content,.studio-form,.studio-preview-column').forEach(element=>{element.scrollTop=0;});
  },[screen,scenario?.id,studioOpen,activeId,activeStep,step,tutorialStep,why]);

  useEffect(()=>{if(!scenario||!branch||gameProgress.sessions[progressKey])return;setGameProgress(prev=>prev.sessions[progressKey]?prev:{...prev,sessions:{...prev.sessions,[progressKey]:makeRunSession(progressKey,scenario.startingState,null)}})},[scenario,branch,progressKey,gameProgress.sessions]);
  useEffect(()=>{try{if(Object.keys(saved).length)localStorage.setItem(SAVE,JSON.stringify(saved));else localStorage.removeItem(SAVE)}catch{if(!storageWarning){setStorageWarning(true);setAnnouncement('Local storage is unavailable; game state is kept in memory for this session.')}}},[saved,storageWarning]);
  useEffect(()=>{const keys=new Set<string>();for(const entry of Object.values(saved)){for(const key of Object.values(entry.branchRunKeys||{}))if(key)keys.add(key);for(const key of entry.archiveRunKeys||[])keys.add(key)}setGameProgress(prev=>retainSessions(prev,keys))},[saved]);

  const go=useCallback((next:Screen,dir=1)=>{if(screen==='result'&&next!=='result'){setNewBestRunId(null);setNewAchievementRunId(null)}setDirection(dir);setScreen(next);setSkip(false);setPreviewRoles([]);setForesightActive(false);setLatestPresentation(null);setStinger(null);setAnnouncement(`${next} screen${scenario?` · ${scenario.title}`:''}`)},[scenario,screen]);
  const updateBranch=useCallback((next:Run,preservePrevious=false,sessionKey?:string)=>{setSaved(prev=>{const old=prev[next.scenarioId]||{branches:[],active:'A' as PathId,archive:[]};const previous=old.branches.find(b=>b.id===next.id);const archived=preservePrevious&&previous?[...(old.archive||[]),previous]:old.archive||[];const archivedKeys=preservePrevious&&previous?[...(old.archiveRunKeys||[]),old.branchRunKeys?.[next.id]||`${next.scenarioId}:${next.id}`]:old.archiveRunKeys||[];return {...prev,[next.scenarioId]:{branches:[...old.branches.filter(b=>b.id!==next.id),next],active:next.id,branchRunKeys:{...old.branchRunKeys,[next.id]:sessionKey||old.branchRunKeys?.[next.id]||`${next.scenarioId}:${next.id}`},archive:archived.slice(-50),archiveRunKeys:archivedKeys.slice(-50)}}});setStep(null)},[]);
  const selectScenario=(s:Scenario,daily:DailyChallenge|null=null)=>{if(selectedTile)return;setSelectedTile(s.id);setScenario(s);setPendingDaily(daily);setStep(null);setForesightActive(false);window.setTimeout(()=>{setSelectedTile(null);go('intro')},reduced?0:450)};
  const chooseScenario=(s:Scenario)=>selectScenario(s,null);
  const openStudioCreate=()=>{setStudioState(prev=>beginCustom(prev));setStudioOpen(true);setAnnouncement('Scenario Studio · create a situation.');};
  const openStudioEdit=(base:Scenario)=>{setStudioState(prev=>beginVariant(prev,base));setStudioOpen(true);setAnnouncement(`Scenario Studio · editing a copy of ${base.title}.`);};
  const openStudioLibrary=()=>{setStudioOpen(true);setAnnouncement('Scenario Studio · your local situations.');};
  const openStudioEditItem=(item:StudioSituation)=>{setStudioState(prev=>({...prev,draft:{situation:structuredClone(item),step:0}}));setStudioOpen(true);setAnnouncement(`Scenario Studio · editing ${item.title}.`);};
  const deleteStudioItem=(id:string)=>{const current=studioStateRef.current;const index=current.situations.findIndex(item=>item.id===id);const item=current.situations[index];if(!item)return;setStudioState(prev=>deleteSituation(prev,id));setStudioUndo({item,index,draft:current.draft?.situation.id===id?current.draft:null});window.clearTimeout(studioUndoTimer.current);studioUndoTimer.current=window.setTimeout(()=>setStudioUndo(null),6000);setAnnouncement(`${item.title} removed. Undo is available for six seconds.`);};
  const undoStudioItem=()=>{const pending=studioUndo;if(!pending)return;const latest=studioStateRef.current;if(latest.situations.some(item=>item.id===pending.item.id)){setStudioUndo(null);return;}if(latest.situations.length>=MAX_SITUATIONS){setAnnouncement(`Undo is unavailable because the ${MAX_SITUATIONS}-situation limit is full.`);setStudioUndo(null);return;}const situations=restoreAtIndex(latest.situations,pending.index,pending.item);const canRestoreDraft=!!pending.draft&&(!latest.draft||latest.draft.situation.id===pending.item.id);setStudioState({...latest,situations,draft:canRestoreDraft?pending.draft:latest.draft});setStudioUndo(null);setAnnouncement(`${pending.item.title} restored.`);};
  const playStudio=(item:StudioSituation)=>{if(!playable(item)||!checkBalance(item).valid){setAnnouncement('This draft must pass the balance check before it can be played.');setStudioOpen(true);return;}const prior=saved[item.id];const stale=prior&&[...prior.branches,...(prior.archive||[])].some(run=>!matchesScenarioRun(item.scenario,run));if(stale){const keys=new Set([...Object.values(prior.branchRunKeys||{}),...(prior.archiveRunKeys||[])]);setSaved(prev=>{const next={...prev};delete next[item.id];return next});setGameProgress(prev=>({...prev,sessions:Object.fromEntries(Object.entries(prev.sessions).filter(([key])=>!keys.has(key)))}));window.setTimeout(()=>setAnnouncement('A saved run no longer matches this edited scenario. Its stale state was cleared; begin a fresh run.'),460);}setStudioOpen(false);selectScenario(item.scenario,null);};
  const importStudio=(item:StudioSituation)=>{setStudioState(prev=>{if(!prev.situations.some(x=>x.id===item.id)&&prev.situations.length>=MAX_SITUATIONS){setAnnouncement(`Scenario Studio is full. Delete one of the ${MAX_SITUATIONS} saved situations before adding another.`);return prev;}return {...prev,situations:[...prev.situations.filter(x=>x.id!==item.id),item],draft:{situation:item,step:0}}});};
  const launchDaily=()=>{const challenge=dailyChallengeFor(new Date(),scenarios);const base=scenarios.find(item=>item.id===challenge.scenarioId)!;selectScenario(challengeScenario(base,challenge),challenge)};
  const navigateRoom=(id:LandmarkId)=>{
    const destination=destinationForLandmark(id);
    setRoomMenuOpen(false);setSettingsOpen(false);setPauseOpen(false);setStudioOpen(false);setRoomFocus(`landmark:${id}`);
    if(screen!=='picker')go('picker',-1);
    if(destination==='studio'){openStudioLibrary();return;}
    if(destination==='settings'){setSettingsOpen(true);setAnnouncement('Planning Room settings.');return;}
    if(destination==='campaign')window.setTimeout(()=>{const main=shellRef.current?.querySelector<HTMLElement>('.library-main.library-picker');if(main)main.scrollTop=0;},0);
    const landmark=roomLandmarks.find(item=>item.id===id);if(landmark)setAnnouncement(`${landmark.label}. ${landmark.description}.`);
  };
  const retryWorld=()=>{setWorldFailureReason(null);setWorldFailed(false);setSlowWorld(false);setAnnouncement('Retrying the 3D Planning Room.');};
  const handleWorldFailure=(reason?:string)=>{const message=worldFallbackReason(false,reason);setWorldFailureReason(message);setWorldFailed(true);setAnnouncement(message);};
  const finishBoot=()=>{window.clearTimeout(bootTimer.current);setBooting(false);try{sessionStorage.setItem('echoes.room.booted.v1','1')}catch{};skipCurrentAnimation()};
  const setEffectMode=(mode:EffectMode)=>{setEffectPreferences(previous=>({...previous,mode}));setMotionOverride(mode!=='full');if(mode==='off')skipCurrentAnimation();setAnnouncement(`Effects set to ${mode}. Simulation rules are unchanged.`)};
  const restartFromPause=()=>{setPauseOpen(false);if(scenario)begin();else navigateRoom('campaign-board')};
  const begin=()=>{
    if(!scenario)return;
    const run=newRun(scenario,'A');const newSession=makeRunSession(newRunKey(),scenario.startingState,pendingDaily);
    setSaved(prev=>{const old=prev[scenario.id];const archive=[...(old?.archive||[]),...(old?.branches||[])].slice(-50);const archiveRunKeys=[...(old?.archiveRunKeys||[]),...(old?.branches||[]).map(item=>old?.branchRunKeys?.[item.id]||`${scenario.id}:${item.id}`)].slice(-50);return {...prev,[scenario.id]:{branches:[run],active:'A',branchRunKeys:{A:newSession.runKey},archive,archiveRunKeys}}});
    setGameProgress(prev=>({...prev,sessions:{...prev.sessions,[newSession.runKey]:newSession}}));setStep(null);setPendingDaily(null);
    if(scenario.id==='college-tech-fest'&&!gameProgress.tutorialComplete){setTutorialStep('decision');setAnnouncement('First run · Step 1 of 3: make a decision.');}
    else setTutorialStep(null);
    go('decision');
  };
  const continueSaved=()=>{if(!scenario||!branch)return;setPendingDaily(session?.daily||null);if(session?.daily)setScenario(applyChallenge(scenarios.find(item=>item.id===scenario.id)!,session.daily));go(branch.status==='completed'?'result':'decision')};
  const putSession=(id:PathId,next:RunSession)=>{setGameProgress(prev=>({...prev,sessions:{...prev.sessions,[next.runKey]:next}}));setSaved(prev=>{const old=prev[scenario!.id];if(!old)return prev;return {...prev,[scenario!.id]:{...old,branchRunKeys:{...old.branchRunKeys,[id]:next.runKey}}}})};
  const recordStudioRun=(run:Run,runSession:RunSession)=>{
    if(!studioItem)return;
    setStudioState(prev=>({...prev,situations:prev.situations.map(item=>item.id!==studioItem.id||item.runHistory.some(record=>record.runId===runSession.runKey)?item:{...item,runHistory:[...item.runHistory,{runId:runSession.runKey,at:new Date().toISOString(),decisions:[...run.decisions],state:{...run.state},outcome:run.outcome}].slice(-20)})}));
  };
  const useTool=(tool:'foresight'|'rewind'|'advisor',detail:string)=>{
    if(!session||toolLock.current)return false;
    const next=consumeTool(gameProgress,progressKey,tool,detail);
    if(!next)return false;
    toolLock.current=true;window.setTimeout(()=>{toolLock.current=false},120);
    setGameProgress(next);playGameSound('tool',gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume);return true;
  };
  const useForesight=()=>{
    if(!scenario||!view||!session||!mission)return;
    const available=optionsFor(scenario,view);if(!available.length){setAnnouncement('Foresight is unavailable because there are no valid decisions.');return;}
    if(!useTool('foresight',`Step ${view.decisions.length+1} directional preview`)){setAnnouncement('No Foresight charges remain.');return;}
    const roleSet=new Set<MeasureRole>();for(const option of available)for(const effect of option.effects){const role=scenario.measures.find(measure=>measure.key===effect.measure)?.role;if(role)roleSet.add(role)}
    const roles=[...roleSet];
    setPreviewRoles(roles);setForesightActive(true);setAnnouncement('Foresight revealed possible directions from the recorded option effects; conditional rules may change results.');
    if(tutorialStep==='foresight')setTutorialStep('rewind');
  };
  const useRewind=()=>{
    if(!scenario||!branch||!session||activeStep!==branch.history.length-1||session.charges.rewind<=0){setAnnouncement('Rewind is unavailable at this recorded position.');return;}
    const restored=rewindLatestDecision(branch);const charges=spendCharge(session.charges,'rewind');if(!restored||!charges)return;
    const nextSession={...session,runKey:newRunKey(),charges,rewinds:session.rewinds+1,toolLog:[...session.toolLog,{tool:'rewind' as const,at:new Date().toISOString(),detail:`Restored before decision ${branch.decisions.length}`} ]};
    updateBranch(restored,true,nextSession.runKey);putSession(activeId,nextSession);setStep(null);go('decision',-1);playGameSound('rewind',gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume);setAnnouncement('Rewind used. The previous engine snapshot is restored exactly.');
    if(tutorialStep==='rewind'){setTutorialStep(null);setGameProgress(prev=>({...prev,tutorialComplete:true}));setAnnouncement('Tutorial complete. One decision was rewound from its saved engine snapshot.');}
  };
  const revealAdvice=(name:AdvisorName)=>{
    if(!scenario||!view||!session)return null;
    const available=optionsFor(scenario,view);if(!available.length)return null;
    const result=advisorFor(scenario,available,name);
    if(!useTool('advisor',`${name} advice at step ${view.decisions.length+1}`)){setAnnouncement('No Advisor charges remain.');return null;}
    setAnnouncement(`${name} offered a preference based on the listed effects.`);return result;
  };
  const choose=useCallback((optionId:string)=>{
    if(!scenario||!branch||!view||!session)return;
    try{
      let source=view;let target=activeId;const forked=activeStep<branch.history.length-1;
      if(forked){target='B';source=restoreRun(branch,activeStep);}
      const next=applyDecision(scenario,{...source,id:target},optionId);
      const nextSession=forked?{...session,runKey:newRunKey()}:session;
      updateBranch(next,forked,nextSession.runKey);if(forked)putSession(target,nextSession);go('consequence');playGameSound('commit',gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume);
      const presentation=effectSequencer.publish(presentationEventsFor(scenario,source,next,nextSession.runKey));
      if(presentation.length)setLatestPresentation(presentation[presentation.length-1]);
      const triggered=[...presentation].reverse().find(event=>event.type==='stinger');
      if(triggered&&effectMode==='full'){setStinger(triggered);window.clearTimeout(stingerTimer.current);stingerTimer.current=window.setTimeout(()=>setStinger(null),600)}
      const worsened=presentation.some(event=>event.changes.some(change=>{const measure=scenario.measures.find(item=>item.key===change.measure);return !!measure&&change.delta!==0&&(measure.higherIsBetter?change.delta<0:change.delta>0)}));
      if(worsened&&effectPreferences.screenShake&&effectMode==='full'){setShakeActive(true);window.clearTimeout(shakeTimer.current);shakeTimer.current=window.setTimeout(()=>setShakeActive(false),120)}
      if(tutorialStep==='decision')setTutorialStep('foresight');
      if(next.status==='completed'){
        if(!builtIn){
          recordStudioRun(next,nextSession);
          setAnnouncement(`${scenario.outcomes.find(item=>item.id===next.outcome)?.label||next.outcome}. Custom results are stored with this situation; campaign rewards are not affected.`);
        } else {
        const other=entry?.branches.find(item=>item.id!==target);
        const bothPathsFinished=!!other&&other.status==='completed'&&other.decisions[0]!==next.decisions[0];
        const record=recordCompletedRun(scenario,next,nextSession,gameProgress.runs,bothPathsFinished);
        const previousStars=gameProgress.bestStars[scenario.id]||0;const award=awardCompletedRun(gameProgress,record,scenario);setGameProgress(award.progress);setRewardFeedback(rewardFeedbackForCompletion(record,gameProgress.runs,previousStars,award.newBest,award.newAchievements));
        setNewBestRunId(award.newBest?record.id:null);setNewAchievementRunId(award.newAchievements.length?record.id:null);
        const stars=evaluateStars(scenario,next.state,next.decisions.length,true,missionFor(scenario.id)!).count;
        setAnnouncement(`${scenario.outcomes.find(item=>item.id===next.outcome)?.label}. ${stars} stars. Score ${record.score}, ${record.rank}.${award.newBest?' New personal best.':''}${award.newAchievements.length?` Achievements earned: ${award.newAchievements.join(', ')}.`:''}`);
        if(!gameProgress.runs.some(item=>item.id===nextSession.runKey)&&stars>0)playGameSound('star',gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume);
        }
      }
    }catch(error){setAnnouncement(error instanceof Error?error.message:'Decision could not be applied.');}
  },[scenario,branch,view,session,activeId,activeStep,entry,updateBranch,go,gameProgress.runs,gameProgress.soundEnabled,tutorialStep,builtIn,studioItem,effectMode,effectPreferences]);
  const continueConsequence=()=>{if(!view||!scenario)return;if(view.status==='completed')go('result');else go('decision')};
  const switchPath=(id:PathId)=>{if(!entry?.branches.some(b=>b.id===id))return;setSaved(prev=>({...prev,[scenario!.id]:{...prev[scenario!.id],active:id}}));setStep(null);const target=entry.branches.find(b=>b.id===id)!;go(target.status==='completed'?'result':'decision')};
  const makeAlternative=()=>{
    if(!scenario||!branch||!session)return;
    const other:PathId=activeId==='A'?'B':'A';const existing=entry?.branches.find(b=>b.id===other);if(existing){switchPath(other);return;}
    const alternate=mostDistinctAlternative(scenario,branch,other);
    if(!alternate){setAnnouncement('No valid alternate completion is available from this run.');return;}
    const altSession=makeRunSession(newRunKey(),scenario.startingState,session.daily);
    updateBranch(alternate,false,altSession.runKey);putSession(other,altSession);go('result');
    const otherPath=entry?.branches.find(item=>item.id===activeId);const both=!!otherPath&&otherPath.status==='completed'&&otherPath.decisions[0]!==alternate.decisions[0];
    if(alternate.status==='completed'){if(!builtIn){recordStudioRun(alternate,altSession);setAnnouncement(`${scenario.outcomes.find(item=>item.id===alternate.outcome)?.label||alternate.outcome}. Alternate custom outcome recorded.`)}else{const record=recordCompletedRun(scenario,alternate,altSession,gameProgress.runs,both);const previousStars=gameProgress.bestStars[scenario.id]||0;const award=awardCompletedRun(gameProgress,record,scenario);setGameProgress(award.progress);setRewardFeedback(rewardFeedbackForCompletion(record,gameProgress.runs,previousStars,award.newBest,award.newAchievements));setNewBestRunId(award.newBest?record.id:null);setNewAchievementRunId(award.newAchievements.length?record.id:null);setAnnouncement(`${scenario.outcomes.find(item=>item.id===alternate.outcome)?.label}. ${record.stars} stars. Score ${record.score}, ${record.rank}.${award.newBest?' New personal best.':''}${award.newAchievements.length?` Achievements earned: ${award.newAchievements.join(', ')}.`:''}`);if(record.stars>0)playGameSound('star',gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume);}}
  };
  const rewind=(n:number)=>{if(!branch)return;const next=Math.max(0,Math.min(n,branch.history.length-1));setStep(next);go(branch.history[next].status==='completed'?'result':'decision',next<activeStep?-1:1)};
  const openTree=()=>{if(!branch)return;const key=`branch:${branch.id}`;const node=treeNodes.find(item=>item.runKey===key&&item.historyIndex===branch.history.length-1);setTreeFocusId(node?.id||'');go('tree')};
  const inspectTreeNode=(id:string)=>{
    if(!scenario||!entry)return;const node=treeNodes.find(item=>item.id===id);const path=treePaths.find(item=>item.key===node?.runKey);if(!node||!path)return;
    const targetId=node.runId;const selectedRun=path.run;
    if(path.archived){const archiveIndex=Number(path.key.split(':')[1]);setSaved(prev=>{const old=prev[scenario.id];if(!old)return prev;const prior=old.branches.find(item=>item.id===targetId);const restored=old.archive?.[archiveIndex];if(!restored)return prev;const archive=(old.archive||[]).filter((_,index)=>index!==archiveIndex);const archiveRunKeys=(old.archiveRunKeys||[]).filter((_,index)=>index!==archiveIndex);if(prior){archive.push(prior);archiveRunKeys.push(old.branchRunKeys?.[targetId]||`${scenario.id}:${targetId}`)}const runKey=old.archiveRunKeys?.[archiveIndex]||`legacy-archive-${scenario.id}-${archiveIndex}`;return {...prev,[scenario.id]:{...old,branches:[...old.branches.filter(item=>item.id!==targetId),{...restored}],branchRunKeys:{...old.branchRunKeys,[targetId]:runKey},archive:archive.slice(-50),archiveRunKeys:archiveRunKeys.slice(-50),active:targetId}}});}
    else if(entry.active!==targetId)setSaved(prev=>({...prev,[scenario.id]:{...prev[scenario.id],active:targetId}}));
    setTreeFocusId(id);setStep(node.historyIndex);go(selectedRun.history[node.historyIndex]?.status==='completed'?'result':'decision');
  };
  const returnToResult=()=>{setStep(null);go('result')};
  const updatePreview=useCallback((preview:{roles:MeasureRole[]}|null)=>{if(preview)setPreviewRoles(preview.roles);else if(!foresightActive)setPreviewRoles([])},[foresightActive]);
  const updateClock=(enabled:boolean)=>{if(!scenario||!session||session.daily)return;putSession(activeId,{...session,clockEnabled:enabled});setAnnouncement(enabled?'Decision clock enabled. The first available option will be selected after 20 seconds.':'Decision clock disabled.');};
  const toggleSound=()=>{const enabled=!gameProgress.soundEnabled;setGameProgress(prev=>({...prev,soundEnabled:enabled}));configureAudio(enabled&&effectMode!=='off',effectPreferences.volume,!hidden,enabled);setAnnouncement(enabled?'Sound enabled.':'Sound muted.');};
  const onMetricReveal=useCallback(()=>playGameSound('tick',gameProgress.soundEnabled&&effectMode!=='off',effectPreferences.volume),[gameProgress.soundEnabled,effectMode,effectPreferences.volume]);
  const completeTutorial=()=>{setTutorialStep(null);setGameProgress(prev=>({...prev,tutorialComplete:true}));setAnnouncement('Tutorial skipped. The current run remains unchanged.');};
  const startGuidedTutorial=()=>{const tutorialScenario=scenarios.find(item=>item.id==='college-tech-fest');if(!tutorialScenario)return;const run=newRun(tutorialScenario,'A');const tutorialSession=makeRunSession(newRunKey(),tutorialScenario.startingState);setScenario(tutorialScenario);setPendingDaily(null);setSaved(prev=>{const old=prev[tutorialScenario.id];const archive=[...(old?.archive||[]),...(old?.branches||[])].slice(-50);const archiveRunKeys=[...(old?.archiveRunKeys||[]),...(old?.branches||[]).map(item=>old?.branchRunKeys?.[item.id]||`${tutorialScenario.id}:${item.id}`)].slice(-50);return {...prev,[tutorialScenario.id]:{branches:[run],active:'A',branchRunKeys:{A:tutorialSession.runKey},archive,archiveRunKeys}}});setGameProgress(prev=>({...prev,tutorialComplete:false,sessions:{...prev.sessions,[tutorialSession.runKey]:tutorialSession}}));setTutorialStep('decision');setTutorialHelp(false);setStep(null);go('decision');setAnnouncement('Guided first run · Step 1 of 3: make a decision.');};
  const reset=()=>{if(scenario){const current=saved[scenario.id];const keys=new Set([...(Object.values(current?.branchRunKeys||{})),...(current?.archiveRunKeys||[]),`${scenario.id}:A`,`${scenario.id}:B`]);setSaved(prev=>{const next={...prev};delete next[scenario.id];return next});setGameProgress(prev=>({...prev,sessions:Object.fromEntries(Object.entries(prev.sessions).filter(([key])=>!keys.has(key)))}));}setStep(null);setScenario(null);setPendingDaily(null);setTutorialStep(null);go('picker',-1)};
  const options=useMemo(()=>scenario&&view?scenario.options.filter(o=>o.effects.every(e=>{const m=scenario.measures.find(x=>x.key===e.measure)!;return view.state[e.measure]+e.delta>=m.domain[0]&&view.state[e.measure]+e.delta<=m.domain[1]})):[],[scenario,view]);
  const replayHistory=(record:import('./game/types').RunRecord)=>{
    const base=scenarios.find(s=>s.id===record.scenarioId);if(!base)return;
    const selected=challengeScenario(base,record.daily);const replay=replayRecord(selected,record);
    if(!replay.matches||!replay.run){setAnnouncement(replay.reason||'Recorded run could not be reproduced.');return;}
    const run=replay.run;const pathId=run.id;const key=record.id;
    let charges={...STARTING_CHARGES};for(const action of record.toolLog){if(action.tool==='foresight'||action.tool==='advisor'||action.tool==='rewind'){const spent=spendCharge(charges,action.tool);if(spent)charges=spent;}}
    const replaySession:RunSession={runKey:record.id,charges,toolLog:[...record.toolLog],rewinds:record.rewinds,foresightUses:record.toolLog.filter(x=>x.tool==='foresight').length,advisorUses:record.toolLog.filter(x=>x.tool==='advisor').length,daily:record.daily,startState:{...record.startState},clockEnabled:false};
    setScenario(selected);setPendingDaily(record.daily);setSaved(prev=>{const old=prev[selected.id]||{branches:[],active:pathId,archive:[]};const previous=old.branches.find(item=>item.id===pathId);const archive=previous?[...(old.archive||[]),previous].slice(-50):old.archive||[];const archiveRunKeys=previous?[...(old.archiveRunKeys||[]),old.branchRunKeys?.[pathId]||`${selected.id}:${pathId}`].slice(-50):old.archiveRunKeys||[];return {...prev,[selected.id]:{branches:[...old.branches.filter(item=>item.id!==pathId),run],active:pathId,branchRunKeys:{...old.branchRunKeys,[pathId]:record.id},archive,archiveRunKeys}}});
    setGameProgress(prev=>({...prev,sessions:{...prev.sessions,[key]:replaySession}}));setStep(null);go('result');setAnnouncement(replay.matches?'Replay verified against the current engine.':'Replay result differs.');
  };
  const onDaily=()=>launchDaily();
  const onLocked=()=>setAnnouncement('Locked situation. Earn at least one star in any earlier situation, or enable Free play.');
  const picker=<ScenarioPicker onSelect={chooseScenario} completed={completed} selectedId={selectedTile} onFocusScenario={setPickerFocus} bestStars={gameProgress.bestStars} freePlay={freePlay} onFreePlayChange={setFreePlay} onDailyChallenge={onDaily} history={gameProgress.runs} achievements={gameProgress.achievements} onReplayRecord={replayHistory} onLocked={onLocked} studioItems={studioState.situations} onStudioCreate={openStudioCreate} onStudioOpen={openStudioLibrary} onStudioEdit={openStudioEdit} onStudioEditItem={openStudioEditItem} onStudioPlay={playStudio} onStudioDelete={deleteStudioItem} plannerXp={plannerXp} plannerLevel={plannerProgress.level}/>;
  const variants=reduced?reducedScreenVariants:screenVariants;
  const gameSummary=builtIn&&scenario&&view&&mission&&session&&resultScore&&currentStarEvaluation?(()=>{
    const latest=gameProgress.runs.find(record=>record.id===session.runKey);
    const best=gameProgress.personalBests[scenario.id]?.score??null;
    const isNewBest=newBestRunId===session.runKey;
    const earned=latest&&newAchievementRunId===latest.id?gameProgress.achievements.filter(a=>latest.completedAt===a.earnedAt).map(a=>{const parts=a.evidence.split(' · ');return parts[parts.length-1]||a.id}):[];
    const impact=bestAndCostliestDecision(scenario,view);
    const describe=(item:typeof impact.best)=>item?scenario.options.find(option=>option.id===item.optionId)?.title||item.optionId:null;
    const decisionSummary={best:impact.best&&impact.best.benefit>impact.best.cost?describe(impact.best):null,costliest:impact.costliest&&impact.costliest.cost>impact.costliest.benefit?describe(impact.costliest):null,chains:view.decisions.flatMap((_,index)=>{const count=chainCountForResult(scenario,view,index+1);return count>=2?[`Step ${index+1}: ${count} measures improved`]:[]})};
    return <GameResultPanel scenario={scenario} mission={mission} stars={currentStarEvaluation} score={resultScore} personalBest={best} newBest={isNewBest} achievementMessages={earned} reduced={!!reduced} decisionSummary={decisionSummary} xpEarned={latest?xpForRecord(latest):0} plannerLevel={plannerProgress.level}/>;
  })():null;
  const gameContent=!scenario||screen==='picker'?picker:
    screen==='intro'?<IntroScreen scenario={scenario} onBegin={begin} hasSaved={!!entry?.branches.length} onContinue={continueSaved} mission={mission} daily={pendingDaily||session?.daily||null} onHowToPlay={()=>setTutorialHelp(true)}/>:
    screen==='decision'&&view&&mission&&score&&session?<DecisionScreen scenario={scenario} run={view} onChoose={choose} onPreviewChange={updatePreview} game={{mission,score,charges:session.charges,foresightActive,daily:!!session.daily,clockEnabled:session.clockEnabled,soundEnabled:gameProgress.soundEnabled,canRewind:!!branch&&activeStep===branch.history.length-1&&branch.history.length>1,onForesight:useForesight,onRewind:useRewind,onClockToggle:updateClock,onSoundToggle:toggleSound,onAdvisorReveal:revealAdvice}}/>:
    screen==='consequence'&&view?<ConsequenceScreen key={view.events.length} scenario={scenario} run={view} onContinue={continueConsequence} onMetricReveal={onMetricReveal} skip={skip} reduced={!!reduced} stinger={stinger&&stinger.runId===session?.runKey?stinger.title:undefined} onDismissStinger={()=>setStinger(null)}/>:
    screen==='result'&&view?<ResultScreen scenario={scenario} run={view} onAlt={makeAlternative} onCompare={()=>go('compare')} onTree={openTree} gameSummary={gameSummary} onRewind={session?.charges.rewind&&branch?.history.length&&activeStep===branch.history.length-1?useRewind:undefined}/>:
    screen==='tree'?<BranchTreeScreen scenario={scenario} paths={treePaths} nodes={treeNodes} selectedId={treeFocusId} onSelect={setTreeFocusId} onInspect={inspectTreeNode} onReturn={returnToResult}/>:
    screen==='compare'&&pathA&&pathB?<CompareScreen scenario={scenario} a={pathA} b={pathB} onWhy={()=>setWhy(true)} onPath={switchPath}/>:
    picker;
  const content=studioOpen?<ScenarioStudio state={studioState} onChange={setStudioState} builtins={scenarios} onExit={()=>setStudioOpen(false)} onPlay={playStudio} onImport={importStudio}/>:gameContent;
  const tutorialCopy=tutorialStep==='decision'?'Step 1 of 3 · Make one decision. The engine will record its effects.':tutorialStep==='foresight'?'Step 2 of 3 · Use Foresight to inspect possible directions. It will not change the simulation.':tutorialStep==='rewind'?'Step 3 of 3 · Use Rewind to restore the exact state before your decision.':null;
  useEffect(()=>{const f=(e:KeyboardEvent)=>{
    const el=e.target as HTMLElement|null;
    if(booting){if([' ','Enter','Escape'].includes(e.key)){e.preventDefault();finishBoot()}return;}
    if(e.key==='Escape'){
      if(why){setWhy(false);return;}if(settingsOpen){setSettingsOpen(false);return;}if(tutorialHelp){setTutorialHelp(false);return;}if(pauseOpen){setPauseOpen(false);return;}
      if(studioOpen&&el?.closest('.studio-form,.studio-preview-column'))return;
      if(!/INPUT|TEXTAREA|SELECT/.test(el?.tagName||'')&&!el?.isContentEditable&&scenario&&screen!=='picker'){setPauseOpen(true);return;}
    }
    if(/INPUT|TEXTAREA|SELECT/.test(el?.tagName||'')||el?.isContentEditable)return;
    if(screen==='picker'&&/^[1-6]$/.test(e.key)){const index=Number(e.key)-1;const s=scenarios[index];if(s&&isScenarioUnlocked(index,gameProgress.bestStars,freePlay))chooseScenario(s);}
    if(e.key===' '&&!el?.closest('button,a,[role="slider"]')){e.preventDefault();skipCurrentAnimation();setStinger(null);}
    if(screen==='consequence'&&(e.key===' '||e.key==='Enter')){e.preventDefault();setSkip(true);setStinger(null);}
    if(e.key==='ArrowLeft'&&branch&&activeStep>0){e.preventDefault();rewind(activeStep-1);}
    if(e.key==='ArrowRight'&&branch&&activeStep<branch.history.length-1){e.preventDefault();rewind(activeStep+1);}
  };window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f)},[screen,branch,activeStep,why,tutorialHelp,gameProgress.bestStars,freePlay,booting,settingsOpen,pauseOpen,studioOpen,scenario]);

  return <div ref={shellRef} data-surface="dark" data-scenario={studioOpen?undefined:scenario?.id} data-scenario-theme={studioOpen?studioState.draft?.situation.metadata.theme:undefined} className={`library-shell ${screen==='consequence'?'is-walnut':''} ${mode!=='static'?'world-enabled':''} ${reduced?'motion-reduced':''} ${skipMotion?'skip-motion':''} ${shakeActive?'has-world-shake':''}`}>
    {mode!=='static'&&<Suspense fallback={<div className="world-loading" aria-hidden="true"/>}><WorldCanvas scenarios={scenarios} scenario={scenario} run={view||null} scenarioTheme={studioItem?.metadata.theme} roomStats={roomStats} rewardFeedback={rewardFeedback} presentationEventKey={latestPresentation?.id||null} comparisonRuns={pathA&&pathB?{a:pathA,b:pathB}:null} treeRuns={treePaths} treeFocusId={treeFocusId} previewRoles={previewRoles} toolCharges={session?.charges} focusedTool={tutorialStep==='foresight'?'foresight':tutorialStep==='rewind'?'rewind':null} onTreeNodeSelect={id=>{setTreeFocusId(id);inspectTreeNode(id)}} onCreateSituation={openStudioCreate} onNavigateRoom={navigateRoom} screen={why?'why':screen} focusKey={screen==='picker'?(roomFocus||pickerFocus||selectedTile||undefined):screen==='tree'?treeFocusId:view?.events[view.events.length-1]?.eventId} mode={mode} reducedMotion={reduced} hidden={hidden} cameraMovement={effectPreferences.cameraMovement} onSelect={chooseScenario} onFailure={handleWorldFailure} onLowPerformance={()=>setSlowWorld(true)} onCameraMoving={setCameraMoving} cameraMoving={cameraMoving}/></Suspense>}
    <header className="library-topbar"><button className="library-brand" onClick={()=>{setStudioOpen(false);setRoomFocus(null);go('picker',-1)}}>ECHOES</button><span>{scenario?.title||'SITUATION LIBRARY'}</span>{scenario&&screen!=='picker'&&<><label className="library-day">{branch?`DAY ${String(view?.day||1).padStart(2,'0')}`:'READY'}</label><button className="change-situation" aria-label="Change situation" onClick={()=>{setStudioOpen(false);setRoomFocus(null);go('picker',-1)}}><span className="situation-label-wide">Change situation</span><span className="situation-label-short">Change</span></button>{branch&&<><label className="top-scrubber"><span>STEP {activeStep+1}/{branch.history.length}</span><input aria-label="Rewind through recorded simulation states" type="range" min="0" max={branch.history.length-1} value={activeStep} onChange={e=>rewind(Number(e.target.value))}/></label><nav className="library-paths" aria-label="Simulation paths">{pathA&&<button aria-pressed={activeId==='A'} onClick={()=>switchPath('A')}>A</button>}{pathB&&<button aria-pressed={activeId==='B'} onClick={()=>switchPath('B')}>B</button>}</nav><button className="library-reset" onClick={reset}>Reset</button></>}</>}{!studioOpen&&screen!=='decision'&&<button className="studio-top-link" onClick={openStudioLibrary}>Studio</button>}{studioOpen&&<button className="studio-top-link" onClick={()=>setStudioOpen(false)}>Close Studio</button>}<button className="room-menu-trigger" aria-haspopup="menu" aria-expanded={roomMenuOpen} onClick={()=>setRoomMenuOpen(open=>!open)}>Planning Room</button><button className="text-button help-topbar" onClick={()=>setTutorialHelp(true)}>How to play</button><button className="motion-toggle" aria-label={reduced?'Turn reduced motion off':'Turn reduced motion on'} aria-pressed={reduced} onClick={()=>{const next=!reduced;setMotionOverride(next);setEffectPreferences(previous=>({...previous,mode:next?'reduced':'full'}))}}><span className="motion-label-wide">Reduce motion {reduced?'on':'off'}</span><span className="motion-label-short">Motion {reduced?'on':'off'}</span></button>{scenario&&screen!=='picker'&&<button className="pause-trigger" onClick={()=>setPauseOpen(true)}>Pause</button>}{mode!=='world'&&<span className="render-mode" aria-live="polite">{mode==='static'?'STATIC VIEW':reduced?'REDUCED 3D':'LITE VIEW'}</span>}{cameraMoving&&mode!=='static'&&<button className="camera-skip" onClick={skipCurrentAnimation}>Settle view</button>}</header>
    {mode==='static'&&<aside className="static-view-notice" role="status"><span>{worldFallbackReason(forcedStatic,worldFailed?worldFailureReason:null)}</span>{worldFailed&&!forcedStatic&&<button className="text-button" onClick={retryWorld}>Retry 3D</button>}</aside>}
    {roomMenuOpen&&<nav className="room-destination-menu" aria-label="Planning Room destinations" role="menu">{roomLandmarks.map(landmark=><button key={landmark.id} role="menuitem" onClick={()=>navigateRoom(landmark.id)}><strong>{landmark.label}</strong><small>{landmark.description}</small></button>)}<button role="menuitem" onClick={()=>{setRoomMenuOpen(false);setTutorialHelp(true)}}><strong>How to play</strong><small>Open the field guide</small></button>{scenario&&screen!=='picker'&&<button role="menuitem" onClick={()=>{setRoomMenuOpen(false);setPauseOpen(true)}}><strong>Pause current run</strong><small>Resume or restart this simulation</small></button>}</nav>}
    <div className="library-announcer" aria-live="polite" aria-atomic="true">{announcement}{latestPresentation?` Latest recorded event: ${latestPresentation.title}.`:''}</div>
    {studioUndo&&screen==='picker'&&!studioOpen&&<div className="studio-undo" role="status">{studioUndo.item.title} removed.<button className="text-button" onClick={undoStudioItem}>Undo</button></div>}
    {scenario&&view&&<div className="scene-description" aria-live="polite">{scenario.title}. Day {view.day}. {scenario.measures.map(m=>`${m.label} ${formatMeasure(scenario,m.key,view.state[m.key])}`).join(', ')}.</div>}
    {tutorialCopy&&<aside className="tutorial-banner" role="status" data-step={tutorialStep}><span>{tutorialCopy}</span><button className="text-button" onClick={completeTutorial}>Skip tutorial</button></aside>}
    <AnimatePresence mode="sync" custom={direction}><motion.main data-surface={studioOpen||screen==='intro'||screen==='decision'?'light':'dark'} data-scenario={studioOpen?undefined:scenario?.id} data-scenario-theme={studioOpen?studioState.draft?.situation.metadata.theme:undefined} key={`${studioOpen?'studio-':''}${screen}-${scenario?.id||''}-${activeId}-${step}`} className={`library-main ${studioOpen?'library-studio':`library-${screen}`} ${tutorialStep?`tutorial-${tutorialStep}`:''}`} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{duration:reduced?motionTokens.duration.small:screenDuration[screen],ease:motionEasings.framerEntrance}} onClick={()=>{if(!studioOpen)skipCurrentAnimation();if(!studioOpen&&screen==='consequence'&&!skip)setSkip(true)}}>{content}</motion.main></AnimatePresence>
    {why&&scenario&&pathA&&pathB&&<WhyOverlay scenario={scenario} a={pathA} b={pathB} active={view||pathA} onClose={()=>setWhy(false)}/>}
    {tutorialHelp&&<div className="game-modal-backdrop" role="presentation" onClick={()=>setTutorialHelp(false)}><section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="howto-title" onClick={e=>e.stopPropagation()}><button className="why-close" aria-label="Close How to play" onClick={()=>setTutorialHelp(false)}>Close</button><p className="eyebrow">ECHOES · Field guide</p><h2 id="howto-title">How to play</h2><ol><li>Choose a response to the current situation. It changes the actual simulation state.</li><li>Foresight uses one charge to show possible directions, not exact forecasts.</li><li>Rewind uses one charge to restore the previous saved decision state.</li><li>Advisor preferences are deterministic; revealing advice uses its charge.</li><li>Complete the mission for stars, then compare recorded paths.</li></ol><button className="primary-button" onClick={startGuidedTutorial}>Start guided tech fest run</button><button className="text-button" onClick={()=>setTutorialHelp(false)}>Close guide</button></section></div>}
    {pauseOpen&&<div className="game-modal-backdrop" role="presentation" onClick={()=>setPauseOpen(false)}><section className="game-modal pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title" onClick={e=>e.stopPropagation()}><button className="why-close" aria-label="Close pause menu" onClick={()=>setPauseOpen(false)}>Close</button><p className="eyebrow">Run paused</p><h2 id="pause-title">Pause menu</h2><p>Progress is saved at the current recorded state.</p><div className="pause-actions"><button className="primary-button" onClick={()=>setPauseOpen(false)}>Resume</button><button className="text-button" onClick={restartFromPause}>Restart this run</button><button className="text-button" onClick={()=>{setPauseOpen(false);setTutorialHelp(true)}}>How to play</button><button className="text-button" onClick={()=>{setPauseOpen(false);setSettingsOpen(true)}}>Effects and audio settings</button><button className="text-button" onClick={()=>navigateRoom('campaign-board')}>Return to the room</button></div></section></div>}
    {settingsOpen&&<div className="game-modal-backdrop" role="presentation" onClick={()=>setSettingsOpen(false)}><section className="game-modal settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={e=>e.stopPropagation()}><button className="why-close" aria-label="Close settings" onClick={()=>setSettingsOpen(false)}>Close</button><p className="eyebrow">Planning Room · Radio</p><h2 id="settings-title">Effects and sound</h2><fieldset><legend>Presentation effects</legend><div className="settings-choice-row">{(['full','reduced','off'] as const).map(value=><button key={value} type="button" aria-pressed={effectPreferences.mode===value} onClick={()=>setEffectMode(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div><small>Off keeps decisions and simulation results available without decorative motion.</small></fieldset><label className="settings-slider">Camera movement <strong>{Math.round(effectPreferences.cameraMovement*100)}%</strong><input type="range" min="0" max="1.5" step=".05" value={effectPreferences.cameraMovement} onChange={event=>setEffectPreferences(current=>({...current,cameraMovement:Number(event.target.value)}))}/></label><label className="settings-slider">Audio volume <strong>{gameProgress.soundEnabled?'On':'Off'} · {Math.round(effectPreferences.volume*100)}%</strong><input type="range" min="0" max=".7" step=".01" value={effectPreferences.volume} onChange={event=>setEffectPreferences(current=>({...current,volume:Number(event.target.value)}))}/></label><button className="text-button" aria-pressed={gameProgress.soundEnabled} onClick={toggleSound}>{gameProgress.soundEnabled?'Mute sound':'Enable sound'}</button><label className="settings-check"><input type="checkbox" checked={effectPreferences.screenShake} disabled={effectMode!=='full'} onChange={event=>setEffectPreferences(current=>({...current,screenShake:event.target.checked}))}/> Optional setbacks-only screen shake</label><label className="settings-select">Table finish <select value={effectPreferences.tableFinish} onChange={event=>setEffectPreferences(current=>({...current,tableFinish:event.target.value==='walnut'?'walnut':'natural'}))}><option value="natural">Natural wood</option><option value="walnut" disabled={!plannerProgress.unlockedCosmetics.includes('Walnut table finish')}>Walnut {!plannerProgress.unlockedCosmetics.includes('Walnut table finish')?'· unlock at level 2':''}</option></select></label><label className="settings-select">Lamp tone <select value={effectPreferences.lampTone} onChange={event=>setEffectPreferences(current=>({...current,lampTone:event.target.value==='amber'?'amber':'default'}))}><option value="default">Room light</option><option value="amber" disabled={!plannerProgress.unlockedCosmetics.includes('Amber lamp tone')}>Amber {!plannerProgress.unlockedCosmetics.includes('Amber lamp tone')?'· unlock at level 6':''}</option></select></label><button className="primary-button" onClick={()=>setSettingsOpen(false)}>Done</button></section></div>}
    {booting&&<div className="boot-curtain" role="dialog" aria-modal="true" aria-label="Entering the Planning Room" onClick={finishBoot}><div><p className="boot-wordmark">ECHOES</p><p className="boot-caption">The Planning Room</p><span className="boot-line"/><button className="text-button" onClick={event=>{event.stopPropagation();finishBoot()}}>Enter the room</button></div></div>}
  </div>;
}

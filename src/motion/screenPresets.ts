import type { WorldScreen } from '../world/WorldCanvas';
import { roomLandmarks } from '../environment/room-layout';

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export function cameraPresetFor(screen: WorldScreen, scenarioIndex: number, selectedScenario: boolean, focusKey?: string, historyStep = 0): CameraPreset {
  if (screen === 'picker') {
    if (focusKey?.startsWith('landmark:')) {
      const landmark = roomLandmarks.find(item => item.id === focusKey.slice('landmark:'.length));
      if (landmark) return { position: [...landmark.camera], target: [...landmark.target] };
    }
    return selectedScenario
      ? { position: [4.8, 4.2, 8.8], target: [2.35, 0.65, -0.15] }
      : { position: [0, 8.5, 14], target: [0, 0.25, 0] };
  }
  const presets: Record<Exclude<WorldScreen, 'picker'>, CameraPreset> = {
    intro: { position: [4.8, 4.2, 8.8], target: [2.35, 0.65, -0.15] },
    decision: { position: [5.1, 3.8, 7.8], target: [1.55, 0.65, -0.15] },
    consequence: { position: [6.4, 3.45, 7.45], target: [1.8, 0.65, -0.15] },
    result: { position: [6, 4.5, 9.2], target: [1.55, 0.65, 0] },
    compare: { position: [0, 7.4, 13.2], target: [0, 0.3, 0] },
    why: { position: [5.35, 3.45, 6.9], target: [1.7, 0.8, 0.05] },
    tree: { position: [0, 7.2, 13.6], target: [0, 0.55, 0] },
  };
  const preset = presets[screen];
  const position = [...preset.position] as CameraPreset['position'];
  const target = [...preset.target] as CameraPreset['target'];
  if (screen === 'result') position[1] += Math.max(0, scenarioIndex % 3) * 0.08;
  if (screen === 'decision' || screen === 'consequence') {
    position[0] += ((historyStep % 3) - 1) * 0.12;
    target[2] += historyStep % 2 ? 0.07 : -0.07;
  }
  if (focusKey && screen === 'why') {
    const emphasis = [...focusKey].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    position[0] += ((emphasis % 3) - 1) * 0.18;
    target[2] += emphasis % 2 ? -0.12 : 0.12;
  }
  if (focusKey && screen === 'tree') {
    const step = Number(focusKey.match(/:state:(\d+)$/)?.[1] || 0);
    const focusedX = -3 + Math.min(1, step / 3) * 6;
    target[0] = focusedX;
    position[0] = focusedX;
  }
  return { position, target };
}

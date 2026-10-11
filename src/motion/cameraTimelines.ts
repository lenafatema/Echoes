import gsap from 'gsap';
import * as THREE from 'three';
import type { CameraPreset } from './screenPresets';
import { motionEasings } from './easings';
import { motionTokens } from './tokens';

export function travelCamera(camera: THREE.Camera, fromTarget: THREE.Vector3, destination: CameraPreset, duration: number, invalidate: () => void, onComplete: () => void) {
  const fromPosition = camera.position.clone();
  const toPosition = new THREE.Vector3(...destination.position);
  const toTarget = new THREE.Vector3(...destination.target);
  const targetStart = fromTarget.clone();
  const progress = { value: 0 };
  const arc = Math.min(1.35, fromPosition.distanceTo(toPosition) * 0.07);
  const timeline = gsap.timeline({ onComplete });
  timeline.to(progress, {
    value: 1,
    duration: Math.max(motionTokens.duration.small, duration),
    ease: motionEasings.gsapTravel,
    onUpdate: () => {
      const t = progress.value;
      const point = fromPosition.clone().lerp(toPosition, t);
      point.y += Math.sin(Math.PI * t) * arc;
      camera.position.copy(point);
      fromTarget.copy(targetStart).lerp(toTarget, t);
      camera.lookAt(fromTarget);
      invalidate();
    },
  });
  return { timeline, target: toTarget };
}

export function skipCameraTimeline(timeline: gsap.core.Timeline | null, camera: THREE.Camera, target: THREE.Vector3, destination: CameraPreset) {
  timeline?.progress(1);
  camera.position.set(...destination.position);
  target.set(...destination.target);
  camera.lookAt(target);
}

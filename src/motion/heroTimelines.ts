import gsap from 'gsap';
import type * as THREE from 'three';
import { motionEasings } from './easings';
import { motionTokens } from './tokens';

export function moveHeroPart(group: THREE.Group, position: readonly [number, number, number], rotation: readonly [number, number, number], duration: number = motionTokens.duration.explode, onUpdate?: () => void) {
  const timeline = gsap.timeline();
  timeline.to(group.position, { x: position[0], y: position[1], z: position[2], duration, ease: motionEasings.gsapTravel, onUpdate }, 0);
  timeline.to(group.rotation, { x: rotation[0], y: rotation[1], z: rotation[2], duration, ease: motionEasings.gsapTravel, onUpdate }, 0);
  return timeline;
}

export function revealCover(cover: THREE.Mesh, onUpdate?: () => void) {
  return gsap.to(cover.position, { x: 2.1, y: 1.02, z: 0.65, duration: motionTokens.duration.cover, ease: motionEasings.gsapTravel, onUpdate });
}

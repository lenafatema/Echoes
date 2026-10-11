import { motionTokens } from './tokens';

export const screenDuration = {
  picker: motionTokens.camera.picker,
  intro: motionTokens.duration.cover,
  decision: motionTokens.duration.medium - 0.05,
  consequence: motionTokens.duration.medium,
  result: motionTokens.duration.large,
  compare: motionTokens.duration.large,
  why: motionTokens.camera.why,
  tree: motionTokens.duration.large,
  rewind: motionTokens.duration.small,
} as const;

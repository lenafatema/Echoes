export const motionTokens = {
  duration: { micro: 0.12, small: 0.22, option: 0.25, medium: 0.4, explode: 0.42, consequence: 0.55, reassemble: 0.5, placement: 0.55, cover: 0.8, resultDraw: 0.8, large: 0.7, scene: 1.0 },
  stagger: { sibling: 0.04 },
  picker: { hoverLift: 0.15, maxRotation: 0.35 },
  camera: { picker: 0.9, screen: 0.75, why: 0.55 },
  consequence: { separation: 0.4, rotationDegrees: 15, counter: 0.45 },
  compare: { separation: 2.05 },
  performance: { desktopDpr: 2, mobileDpr: 1.5, liteDpr: 1, liteFps: 30 },
} as const;

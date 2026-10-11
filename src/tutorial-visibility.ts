export type TutorialScreen = 'picker' | 'intro' | 'decision' | 'consequence' | 'result' | 'compare' | 'tree';

/** The guided tutorial teaches decision-screen actions, so keep its banner scoped there. */
export function tutorialVisibleOnScreen(screen: TutorialScreen, studioOpen = false): boolean {
  return screen === 'decision' && !studioOpen;
}

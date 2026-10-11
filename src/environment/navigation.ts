import type { LandmarkId } from './landmarks';

export type RoomDestination = 'campaign' | 'my-situations' | 'studio' | 'achievements' | 'history' | 'settings';

const destinations: Record<LandmarkId, RoomDestination> = {
  'campaign-board': 'campaign',
  'drawer-cabinet': 'my-situations',
  'drafting-desk': 'studio',
  'medal-shelf': 'achievements',
  ledger: 'history',
  radio: 'settings',
};

export function destinationForLandmark(id: LandmarkId): RoomDestination {
  return destinations[id];
}

export function pickerDetailsIndexForLandmark(id: LandmarkId): number | null {
  if (id === 'drawer-cabinet') return 0;
  if (id === 'medal-shelf') return 2;
  if (id === 'ledger') return 3;
  return null;
}

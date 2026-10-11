export interface RoomStats {
  stars: number;
  achievementCount: number;
  recordCount: number;
  situationCount: number;
  /** Cosmetic presentation only; never read by the simulation engine. */
  tableFinish?: 'natural' | 'walnut';
  lampTone?: 'default' | 'amber';
}

export interface RewardFeedback {
  /** Unique authoritative run/award identity. Repeated renders must not replay the effect. */
  id: string;
  kind: 'star' | 'rank' | 'achievement' | 'personal-best';
}

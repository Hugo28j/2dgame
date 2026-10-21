/** World 2 balance and animation timings, kept separate from shared enemy logic. */
export const FROZEN_BALANCE = Object.freeze({
  rangerHpMultiplier: 2, // Doubles the already buffed 1.5x HP.
  rangerDamageMultiplier: 2, // Doubles the already buffed 2x damage.
  golemHpMultiplier: 3,
  golemSpeedMultiplier: 2,
  shotgunHpMultiplier: 6,
  glacierWardenHpMultiplier: 3,
  snowSentinelHpMultiplier: 4,
  sentinelSummonIntervalMs: 20000,
  sentinelPhaseOneCount: 4,
  sentinelPhaseTwoCount: 6,
  sentinelMaxActiveGolems: 24,
  snowballsPerSecond: 10,
  snowFallDurationMs: 900,
  snowFallRadius: 15,
  snowballWallFragments: 5,
  boulderChargeMs: 1000,
  boulderSpeed: 290,
  boulderRadius: 32,
});

export const WORLD2_UNLOCK_ROOMS = Object.freeze({
  archer: 1, mage: 3, slime: 11, tank: 16, bomber: 21, charger: 26,
});

export function glacierBossSlot(room: number): number {
  // Room 15 features only Snow Sentinel, previously the second boss slot.
  return room === 15 ? 1 : 0;
}

/** Only Frozen Hollow (world 2), rooms 1-9. Room 5/10 remain bosses. */
export const FROZEN_EARLY = Object.freeze({
  world: 2,
  lastRoom: 10,
  firstWitchRoom: 3,
  witchSummonIntervalMs: 5000,
  witchSummonCount: 2,
  maxSummonsPerWitch: 6,
  maxActiveSummonsPerRoom: 12,
  witchOrbSpeed: 220,
  witchOrbRadius: 68,
  witchOrbDamageFactor: 0.8,
  chillDurationMs: 1900,
  chillSpeedFactor: 0.55,
  freezeDurationMs: 2300,
});

export function earlyFrozenEnemy(room: number, spawnIndex: number): 'archer' | 'mage' | 'boss' {
  if (room % 5 === 0) return 'boss';
  if (room < FROZEN_EARLY.firstWitchRoom) return 'archer';
  // Witch is the second new enemy type, first guaranteed in room 3.
  return spawnIndex === 0 || (spawnIndex + room) % 4 === 0 ? 'mage' : 'archer';
}

export function canSummonFrostMinions(
  aliveSummons: number, summonedByWitch: number, count: number,
): boolean {
  return count > 0 &&
    aliveSummons + count <= FROZEN_EARLY.maxActiveSummonsPerRoom &&
    summonedByWitch + count <= FROZEN_EARLY.maxSummonsPerWitch;
}

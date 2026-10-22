/** Stable and independent opening cadence: identical enemies in the same room
 * must not all fire on the exact same frame. No gameplay randomness required. */
export function initialEnemyShotDelay(enemyId: string, intervalMs: number): number {
  let hash = 2166136261;
  for (let i = 0; i < enemyId.length; i++) {
    hash = Math.imul(hash ^ enemyId.charCodeAt(i), 16777619);
  }
  // Roughly 65%-135% of the archetype's interval; subsequent casts
  // still use its original attackIntervalMs and difficulty multipliers.
  const spread = (hash >>> 0) / 0xffffffff;
  return Math.round(intervalMs * (0.65 + 0.7 * spread));
}

/** Suspend a specific enemy's cooldown for a fresh or extended stun.
 * A stun never modifies another enemy's deadline. */
export function delayEnemyAttackForStun(
  scheduledAt: number, now: number, oldStunEndsAt: number, newStunEndsAt: number,
): number {
  const additionalMs = Math.max(0, newStunEndsAt - Math.max(now, oldStunEndsAt));
  if (additionalMs <= 0) return scheduledAt;
  return Math.max(now, scheduledAt) + additionalMs;
}

/** A standing enemy may strike at its own melee attack interval.
 * This is NOT player invulnerability: projectiles, explosions, and other
 * enemies always resolve their own hits independently. */
export function contactHitReady(now: number, nextAt: number): boolean {
  return Number.isFinite(now) && now >= nextAt;
}

export function nextContactHitAt(now: number, attackIntervalMs: number): number {
  return now + Math.max(1, Number.isFinite(attackIntervalMs) ? attackIntervalMs : 1);
}

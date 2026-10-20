/** Spore Alchemist's persistent poison field. Its hit cadence is separate from
 * normal boss telegraphs, so hazard duration is consistent at any FPS.
 */
export const SPORE_POISON = Object.freeze({
  durationMs: 1500,
  tickMs: 820,
  damageMultiplier: 0.24,
  bottleFlightMs: 530,
});

export function poisonActive(now: number, startAt: number): boolean {
  return now >= startAt && now < startAt + SPORE_POISON.durationMs;
}

export function poisonCovers(x: number, y: number, radius: number,
  heroX: number, heroY: number): boolean {
  return (heroX - x) ** 2 + (heroY - y) ** 2 <= radius * radius;
}

export function poisonTickDue(now: number, nextTickAt: number): boolean {
  return now >= nextTickAt;
}

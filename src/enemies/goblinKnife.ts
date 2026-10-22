/** World 1's first melee mob is a knife-wielding goblin.
 * A visible wind-up precedes the actual hit, which lands midway through
 * the slash. The timing is per goblin and never grants the player i-frames. */
export const GOBLIN_KNIFE_WINDUP_MS = 145;
export const GOBLIN_KNIFE_IMPACT_MS = 235;
export const GOBLIN_KNIFE_SLASH_END_MS = 320;
export const GOBLIN_KNIFE_TOTAL_MS = 425;
export const GOBLIN_KNIFE_HIT_RANGE = 46;

/** Returned radians are hero-facing-right local coordinates in Phaser,
 * with up being negative Y. Idle grip faces forward and slightly upward. */
export function goblinKnifeAngle(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= GOBLIN_KNIFE_TOTAL_MS)
    return -0.35;
  if (elapsedMs < GOBLIN_KNIFE_WINDUP_MS) {
    const t = elapsedMs / GOBLIN_KNIFE_WINDUP_MS;
    return -0.35 - t * 1.08;
  }
  if (elapsedMs < GOBLIN_KNIFE_SLASH_END_MS) {
    const t = (elapsedMs - GOBLIN_KNIFE_WINDUP_MS) /
      (GOBLIN_KNIFE_SLASH_END_MS - GOBLIN_KNIFE_WINDUP_MS);
    // Acceleration and recovery from the raised blade down through the target.
    const eased = t * t * (3 - 2 * t);
    return -1.43 + eased * 2.55;
  }
  const t = (elapsedMs - GOBLIN_KNIFE_SLASH_END_MS) /
    (GOBLIN_KNIFE_TOTAL_MS - GOBLIN_KNIFE_SLASH_END_MS);
  return 1.12 - t * 1.47;
}

export function goblinKnifeSwingActive(elapsedMs: number): boolean {
  return Number.isFinite(elapsedMs) &&
    elapsedMs >= GOBLIN_KNIFE_WINDUP_MS &&
    elapsedMs < GOBLIN_KNIFE_SLASH_END_MS;
}

export function goblinKnifeCanHit(distance: number): boolean {
  return Number.isFinite(distance) && distance >= 0 &&
    distance <= GOBLIN_KNIFE_HIT_RANGE;
}

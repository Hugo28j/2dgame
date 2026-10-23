/** Timing shared by the Briar Archer AI and its bow overlay. The projectile is
 * released only after the string has visibly reached its full draw. */
export const BRIAR_ARCHER_DRAW_MS = 420;
export const BRIAR_ARCHER_RELEASE_MS = 150;

/** 0 = relaxed string, 1 = fully drawn. Keeps animation math deterministic. */
export function briarBowDrawAmount(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs < BRIAR_ARCHER_DRAW_MS) return elapsedMs / BRIAR_ARCHER_DRAW_MS;
  if (elapsedMs < BRIAR_ARCHER_DRAW_MS + BRIAR_ARCHER_RELEASE_MS)
    return 1 - (elapsedMs - BRIAR_ARCHER_DRAW_MS) / BRIAR_ARCHER_RELEASE_MS;
  return 0;
}

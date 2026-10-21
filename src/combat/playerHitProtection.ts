/** Shared protection after any successful or parried hit.
 * Enemy contact attack intervals may be faster than this protection,
 * but cannot remove the player's chance to escape a mob group.
 */
export const PLAYER_HIT_INVULNERABILITY_MS = 1000;

/** Boss hazards may request longer protection; never allow shorter windows. */
export function playerHitProtectionMs(requestedMs = PLAYER_HIT_INVULNERABILITY_MS): number {
  return Number.isFinite(requestedMs)
    ? Math.max(PLAYER_HIT_INVULNERABILITY_MS, requestedMs)
    : PLAYER_HIT_INVULNERABILITY_MS;
}

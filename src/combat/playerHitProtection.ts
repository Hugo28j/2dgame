import { absorbWithShield } from '../abilities/ShieldHealth';
import type { InvulnerabilityWindow } from './InvulnerabilityWindow';

/** Every successful hit, including one absorbed by a shield, starts this
 * global protection. The damage source cannot skip it by calling receiveDamage
 * instead of the scene's damage helper.
 */
export const PLAYER_HIT_INVULNERABILITY_MS = 1000;

/** Boss hazards may request longer protection; never allow shorter windows. */
export function playerHitProtectionMs(requestedMs = PLAYER_HIT_INVULNERABILITY_MS): number {
  return Number.isFinite(requestedMs)
    ? Math.max(PLAYER_HIT_INVULNERABILITY_MS, requestedMs)
    : PLAYER_HIT_INVULNERABILITY_MS;
}

export interface ProtectedPlayerHit {
  health: number;
  shield: number;
  defeated: boolean;
  accepted: boolean;
}

/** Authoritative HP/shield entry point. It grants immunity *as part of
 * applying the hit*, not later in a separate animation or scene callback.
 */
export function applyProtectedPlayerHit(
  now: number,
  health: number,
  shield: number,
  amount: number,
  invulnerability: InvulnerabilityWindow,
): ProtectedPlayerHit {
  if (health <= 0 || !Number.isFinite(amount) || amount <= 0 ||
    invulnerability.isActive(now)) {
    return { health, shield, defeated: health <= 0, accepted: false };
  }
  invulnerability.activate(now, PLAYER_HIT_INVULNERABILITY_MS);
  return { ...absorbWithShield(health, shield, amount), accepted: true };
}

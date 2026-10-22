import { absorbWithShield } from '../abilities/ShieldHealth';
import type { InvulnerabilityWindow } from './InvulnerabilityWindow';

/** Every separate attack applies damage, even in the same millisecond.
 * Only an explicitly activated ability (dash/teleport) can prevent damage.
 * Receiving damage or parrying a hit NEVER activates an immunity window. */
export interface PlayerHitResult {
  health: number;
  shield: number;
  defeated: boolean;
  accepted: boolean;
}

export function applyPlayerHit(
  now: number,
  health: number,
  shield: number,
  amount: number,
  abilityInvulnerability: InvulnerabilityWindow,
): PlayerHitResult {
  if (health <= 0 || !Number.isFinite(amount) || amount <= 0 ||
      abilityInvulnerability.isActive(now)) {
    return { health, shield, defeated: health <= 0, accepted: false };
  }
  return { ...absorbWithShield(health, shield, amount), accepted: true };
}

import { MAX_ABILITY_LEVEL } from './abilityConfig';

/** Guardian's directed gravity corridor is independent of level; only stun scales. */
export const GUARDIAN_PULL_HALF_WIDTH = 55;
export const GUARDIAN_PULL_DURATION_MS = 265;

export function guardianPullStunMs(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_ABILITY_LEVEL,
    Number.isFinite(level) ? Math.floor(level) : 1));
  return Math.round(800 + 600 * (clamped - 1) / (MAX_ABILITY_LEVEL - 1));
}

/** Pull the enemy close without shooting it through or behind the Guardian. */
export function guardianPullSpeed(distance: number): number {
  return Math.max(0, Math.min(710, (distance - 37) / (GUARDIAN_PULL_DURATION_MS / 1000)));
}

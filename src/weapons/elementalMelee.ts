import type { Vector2Value } from '../input/vectorMath';
import { normalizedDirection } from '../abilities/directedGeometry';

export const BIG_WAVE = Object.freeze({
  halfWidth: 75,
  splashPadding: 28,
  durationMs: 390,
  knockbackMs: 440,
  knockbackSpeed: 405,
  splashMultiplier: 0.72,
});

export const FLAMETHROWER = Object.freeze({
  damageTickMs: 200,
  burnTickMs: 1000,
  burnDurationMs: 2600,
  burnRatio: 0.30,
  coneStartHalfWidth: 15,
  coneEndHalfWidth: 63,
  visualFlickerMs: 115,
});

/** A short travelling horizontal crest, not a long-distance projectile.
 * Direct hits cover the center; the widened edges receive splash damage. */
export function bigWaveHitKind(
  origin: { x: number; y: number },
  direction: Readonly<Vector2Value>,
  target: { x: number; y: number },
  reachedDistance: number,
  maxRange: number,
  targetRadius = 15,
): 'direct' | 'splash' | null {
  const aim = normalizedDirection(direction);
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const forward = dx * aim.x + dy * aim.y;
  const side = Math.abs(-dx * aim.y + dy * aim.x);
  const radius = Math.max(0, targetRadius);
  if (forward < -radius || forward > Math.min(maxRange, reachedDistance) + radius ||
      forward > maxRange + radius) return null;
  if (side <= BIG_WAVE.halfWidth + radius) return 'direct';
  if (side <= BIG_WAVE.halfWidth + BIG_WAVE.splashPadding + radius) return 'splash';
  return null;
}

/** Continuous flame contact stays close to the player and expands toward the tip. */
export function flameConeHits(
  origin: { x: number; y: number },
  direction: Readonly<Vector2Value>,
  target: { x: number; y: number },
  range: number,
  targetRadius = 15,
): boolean {
  const aim = normalizedDirection(direction);
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const forward = dx * aim.x + dy * aim.y;
  if (forward < -targetRadius || forward > range + targetRadius) return false;
  const side = Math.abs(-dx * aim.y + dy * aim.x);
  const along = Math.max(0, Math.min(1, forward / Math.max(1, range)));
  const halfWidth = FLAMETHROWER.coneStartHalfWidth +
    (FLAMETHROWER.coneEndHalfWidth - FLAMETHROWER.coneStartHalfWidth) * along;
  return side <= halfWidth + targetRadius;
}

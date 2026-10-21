import type { Vector2Value } from '../input/vectorMath';
import { inForwardRectangle, normalizedDirection } from '../abilities/directedGeometry';
import { isInsideMeleeSwing, type MeleePoint } from './meleeCombat';

export type GlacialStrike = 0 | 1 | 2;

/** A separate 3-hit cycle; never also uses the generic melee swing. */
export const GLACIAL_COMBO = Object.freeze({
  shortReach: [1.2, 1.3] as readonly [number, number],
  shortArc: [1.22, 1.08] as readonly [number, number],
  thrustReach: 2.45,
  thrustHalfWidth: 17,
  shortTempoMultiplier: 0.77,
  recoveryTempoMultiplier: 2.18,
  slashAnimationMs: 165,
  thrustAnimationMs: 245,
  recoveryAnimationMs: 240,
});

/** Two visibly longer, opposite-direction cuts followed by an extended narrow thrust. */
export function glacialStrikeShape(strike: GlacialStrike, baseRange: number):
  { kind: 'slash' | 'thrust'; reach: number; arc: number; halfWidth: number } {
  return strike === 2
    ? { kind: 'thrust', reach: baseRange * GLACIAL_COMBO.thrustReach,
        arc: 0, halfWidth: GLACIAL_COMBO.thrustHalfWidth }
    : { kind: 'slash', reach: baseRange * GLACIAL_COMBO.shortReach[strike],
        arc: GLACIAL_COMBO.shortArc[strike], halfWidth: 0 };
}

export function glacialStrikeHits(
  strike: GlacialStrike, origin: Readonly<MeleePoint>,
  direction: Readonly<Vector2Value>, target: Readonly<MeleePoint>,
  baseRange: number, extraRange: number,
): boolean {
  const shape = glacialStrikeShape(strike, baseRange * (1 + extraRange));
  const aim = normalizedDirection(direction);
  return shape.kind === 'slash'
    ? isInsideMeleeSwing(origin, aim, target, shape.reach, shape.arc)
    : inForwardRectangle(origin.x, origin.y, aim, target.x, target.y,
        shape.reach, shape.halfWidth);
}

/** Existing fire rate and upgrades still influence cadence. Step 3 rests longer. */
export function glacialStrikeDelayMs(strike: GlacialStrike, shotsPerSecond: number): number {
  if (!(shotsPerSecond > 0)) throw new Error('Frostblade fire rate must be positive');
  return 1000 / shotsPerSecond * (strike === 2
    ? GLACIAL_COMBO.recoveryTempoMultiplier : GLACIAL_COMBO.shortTempoMultiplier);
}

export function nextGlacialStrike(strike: GlacialStrike): GlacialStrike {
  return ((strike + 1) % 3) as GlacialStrike;
}

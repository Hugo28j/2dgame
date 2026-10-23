import type { WeaponId } from '../weapons/weaponConfig';

/** Visual dimensions in world pixels for the 56px displayed hero. Keeping
 * these in one place prevents weapons and projectile origins drifting apart. */
export const HERO_WEAPON_PROPORTIONS = Object.freeze({
  sword: Object.freeze({ handX: 15, guardOffset: 7, bladeLength: 22, tipLength: 7 }),
  hammer: Object.freeze({ handX: 14, shaftLength: 27, headHalfSpan: 12, headHalfDepth: 7 }),
  bow: Object.freeze({ gripX: 16, halfHeight: 23, bellyForward: 22, arrowForward: 30 }),
  crossbow: Object.freeze({ gripX: 16, stockBack: 9, stockForward: 28, halfSpan: 16 }),
});

/** Spawn the projectile at the visible weapon front instead of inside the hero. */
export function heroWeaponMuzzleDistance(weapon: WeaponId): number {
  if (weapon === 'bow') return 46;
  if (weapon === 'crossbow') return 45;
  return 29;
}

import type { WeaponId } from '../weapons/weaponConfig';

/** Visual dimensions in world pixels for the 56px displayed hero. Keeping
 * these in one place prevents weapons and projectile origins drifting apart. */
export const HERO_WEAPON_PROPORTIONS = Object.freeze({
  sword: Object.freeze({ handX: 15, guardOffset: 7, bladeLength: 22, tipLength: 7 }),
  hammer: Object.freeze({ handX: 14, shaftLength: 27, headHalfSpan: 12, headHalfDepth: 7 }),
  bow: Object.freeze({ gripX: 17, halfHeight: 21, bellyForward: 20, arrowForward: 27 }),
  crossbow: Object.freeze({ gripX: 17, stockBack: 6, stockForward: 24, halfSpan: 14 }),
});

/** Spawn the projectile at the visible weapon front instead of inside the hero. */
export function heroWeaponMuzzleDistance(weapon: WeaponId): number {
  if (weapon === 'bow') return 39;
  if (weapon === 'crossbow') return 40;
  return 29;
}

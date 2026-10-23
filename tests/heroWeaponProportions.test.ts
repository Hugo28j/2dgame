import { describe, expect, it } from 'vitest';
import { HERO_WEAPON_PROPORTIONS, heroWeaponMuzzleDistance,
} from '../src/heroes/heroWeaponProportions';

describe('Guardian and Ranger visual weapon proportions', () => {
  it('keeps the sword and hammer readable without dwarfing a 56px hero', () => {
    const sword = HERO_WEAPON_PROPORTIONS.sword;
    const hammer = HERO_WEAPON_PROPORTIONS.hammer;
    expect(sword.handX + sword.guardOffset + sword.bladeLength + sword.tipLength)
      .toBeLessThanOrEqual(52);
    expect(hammer.handX + hammer.shaftLength + hammer.headHalfDepth)
      .toBeLessThanOrEqual(50);
    expect(hammer.headHalfSpan * 2).toBeLessThan(30);
  });

  it('places Ranger projectiles at the visible bow and crossbow muzzle', () => {
    expect(heroWeaponMuzzleDistance('bow')).toBe(39);
    expect(heroWeaponMuzzleDistance('crossbow')).toBe(40);
    expect(heroWeaponMuzzleDistance('staff')).toBe(29);
  });
});

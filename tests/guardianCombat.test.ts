import { describe, expect, it } from 'vitest';
import { shouldParryHit } from '../src/combat/parry';
import { HERO_IDS, HEROES } from '../src/heroes/heroConfig';
import { WEAPONS, getWeaponStats } from '../src/weapons/weaponConfig';
import { isInsideMeleeSwing } from '../src/weapons/meleeCombat';

describe('Guardian parry', () => {
  it('parries exactly 20% of valid hits when the Guardian is selected', () => {
    expect(HEROES.guardian.parryChance).toBe(0.20);
    expect(shouldParryHit('guardian', 0)).toBe(true);
    expect(shouldParryHit('guardian', 0.199999)).toBe(true);
    expect(shouldParryHit('guardian', 0.2)).toBe(false);
    expect(shouldParryHit('guardian', 0.99)).toBe(false);
    for (const hero of HERO_IDS) {
      if (hero !== 'guardian') expect(shouldParryHit(hero, 0)).toBe(false);
    }
  });

  it('rejects invalid rolls rather than granting a free block', () => {
    for (const roll of [NaN, Infinity, -0.01]) {
      expect(shouldParryHit('guardian', roll)).toBe(false);
    }
  });
});

describe('Guardian Dawnblade', () => {
  it('has slightly longer range and a distinct knockback effect', () => {
    expect(WEAPONS.sunblade.meleeRange).toBeGreaterThan(82);
    expect(WEAPONS.sunblade.meleeRange).toBeLessThanOrEqual(100);
    expect(WEAPONS.sunblade.specialEffects).toContain('knockback');
    expect(WEAPONS.warhammer.specialEffects).not.toContain('knockback');
    expect(isInsideMeleeSwing({ x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 92, y: 0 }, getWeaponStats('sunblade', 1).meleeRange,
      WEAPONS.sunblade.meleeArc)).toBe(true);
    expect(isInsideMeleeSwing({ x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 101, y: 0 }, getWeaponStats('sunblade', 1).meleeRange,
      WEAPONS.sunblade.meleeArc)).toBe(false);
  });
});

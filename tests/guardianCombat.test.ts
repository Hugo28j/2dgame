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
  it('registers hits when the painted slash touches the edge of a mob', () => {
    const range = WEAPONS.sunblade.meleeRange;
    const arc = WEAPONS.sunblade.meleeArc;
    const origin = { x: 0, y: 0 };
    const aim = { x: 1, y: 0 };
    // Previously a mob at x=110 visibly overlapped the 96px slash
    // but its centre was outside the melee hitbox.
    expect(isInsideMeleeSwing(origin, aim, { x: 110, y: 0 }, range, arc)).toBe(false);
    expect(isInsideMeleeSwing(origin, aim, { x: 110, y: 0 }, range, arc, 20)).toBe(true);
    expect(isInsideMeleeSwing(origin, aim, { x: 117, y: 0 }, range, arc, 20)).toBe(false);
    // Also catches a grazing hit at the angular edge of the crescent.
    const nearArcEdge = arc / 2 + 0.1;
    const edgeEnemy = { x: 90 * Math.cos(nearArcEdge), y: 90 * Math.sin(nearArcEdge) };
    expect(isInsideMeleeSwing(origin, aim, edgeEnemy, range, arc)).toBe(false);
    expect(isInsideMeleeSwing(origin, aim, edgeEnemy, range, arc, 20)).toBe(true);
    // Normal sector-based melee still uses center-point geometry; Big Wave uses its own hitbox.
    expect(isInsideMeleeSwing(origin, aim, { x: 130, y: 0 },
      WEAPONS.stormlance.meleeRange, WEAPONS.stormlance.meleeArc)).toBe(false);
  });

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

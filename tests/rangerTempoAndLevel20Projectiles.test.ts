import { describe, expect, it } from 'vitest';
import { ABILITIES, HERO_ABILITIES, getAbilityStats, MAX_ABILITY_LEVEL } from '../src/abilities/abilityConfig';
import { HEROES } from '../src/heroes/heroConfig';
import { defaultProfile, validateProfile } from '../src/progression/ProgressStore';
import { abilityMenuSummary } from '../src/ui/menuPresentation';
import { getWeaponStats, MAX_WEAPON_LEVEL, WEAPONS } from '../src/weapons/weaponConfig';
import { isInsideMeleeSwing } from '../src/weapons/meleeCombat';

describe('Guardian Dawnblade range progression', () => {
  it('starts at 96 pixels and gradually doubles to 192 pixels at weapon level 30', () => {
    expect(MAX_WEAPON_LEVEL).toBe(30);
    const start = getWeaponStats('sunblade', 1);
    const end = getWeaponStats('sunblade', 30);
    expect(start.meleeRange).toBe(96);
    expect(end.meleeRange).toBe(192);
    expect(end.meleeRange).toBe(start.meleeRange * 2);
    let previous = 0;
    for (let level = 1; level <= MAX_WEAPON_LEVEL; level++) {
      const range = getWeaponStats('sunblade', level).meleeRange;
      expect(range).toBeGreaterThan(previous);
      previous = range;
    }
    // The painted arc and hit detection consume the same effective meleeRange.
    const owner = { x: 0, y: 0 }, forward = { x: 1, y: 0 }, farEnemy = { x: 180, y: 0 };
    expect(isInsideMeleeSwing(owner, forward, farEnemy, start.meleeRange, start.meleeArc)).toBe(false);
    expect(isInsideMeleeSwing(owner, forward, farEnemy, end.meleeRange, end.meleeArc)).toBe(true);
    expect(WEAPONS.warhammer.meleeRange).toBe(260);
  });
});

describe('Projectiles unlocked at level 20', () => {
  for (const id of ['bow', 'daggers'] as const) {
    it(`${id} starts with one and fires two at level 20 through level 30`, () => {
      expect(WEAPONS[id].projectileCount).toBe(1);
      for (const level of [1, 2, 19]) expect(getWeaponStats(id, level).projectileCount).toBe(1);
      for (const level of [20, 21, 30, 999]) expect(getWeaponStats(id, level).projectileCount).toBe(2);
      expect(getWeaponStats(id, 20).fireRate).toBeGreaterThan(getWeaponStats(id, 19).fireRate);
    });
  }
  it('leaves Arcane Staff two-shot and all other weapons unchanged', () => {
    expect(getWeaponStats('staff', 19).projectileCount).toBe(1);
    expect(getWeaponStats('staff', 20).projectileCount).toBe(2);
    expect(getWeaponStats('crossbow', 30).projectileCount).toBe(1);
  });
});

describe('Ranger third skill: Overdrive', () => {
  const id = 'ranger-volley';
  it('replaces Wolf Ally without changing its permanent saved ability ID or slot', () => {
    expect(HERO_ABILITIES.ranger[2]).toBe(id);
    expect(ABILITIES[id].slot).toBe(3);
    expect(ABILITIES[id].unlockLevel).toBe(30);
    expect(ABILITIES[id].kind).toBe('rapidFire');
    expect(ABILITIES[id].name).toBe('Ranger Overdrive');
    const save = defaultProfile();
    const migrated = validateProfile({ ...save, abilityLevels: { ...save.abilityLevels, [id]: 17 } });
    expect(migrated.abilityLevels[id]).toBe(17);
  });
  it('scales from 7s at 1.2x to 15s at 2.5x, with a fixed 25s base cooldown', () => {
    expect(MAX_ABILITY_LEVEL).toBe(20);
    const start = getAbilityStats(id, 1);
    const end = getAbilityStats(id, 20);
    expect(start.durationMs).toBe(7000);
    expect(end.durationMs).toBe(15000);
    expect(start.attackSpeedMultiplier).toBe(1.2);
    expect(end.attackSpeedMultiplier).toBe(2.5);
    expect(start.cooldownMs).toBe(25000);
    let lastDuration = 0, lastFactor = 0;
    for (let level = 1; level <= MAX_ABILITY_LEVEL; level++) {
      const stats = getAbilityStats(id, level);
      expect(stats.durationMs).toBeGreaterThan(lastDuration);
      expect(stats.attackSpeedMultiplier).toBeGreaterThan(lastFactor);
      expect(stats.cooldownMs).toBe(25000);
      lastDuration = stats.durationMs;
      lastFactor = stats.attackSpeedMultiplier;
    }
    expect(getAbilityStats(id, 200)).toEqual(end);
    expect(abilityMenuSummary(end)).toContain('2.50× AANVALSSNELHEID');
    expect(abilityMenuSummary(end)).toContain('15.0S DUUR');
  });
  it('preserves the old Stormstrider rapid-fire multiplier', () => {
    expect(getAbilityStats('storm-pulse', 1).attackSpeedMultiplier).toBe(2.15);
    expect(HEROES.ranger.stats.attackSpeed).toBe(1.15);
  });
});

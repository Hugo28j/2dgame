import { describe, expect, it } from 'vitest';
import { HEROES } from '../src/heroes/heroConfig';
import { GUARDIAN_WEAPON_DAMAGE_MULTIPLIER, HERO_WEAPONS, MAX_WEAPON_LEVEL,
  WARHAMMER_MAX_ATTACK_INTERVAL_MS, WEAPONS, fireIntervalMs, getWeaponStats,
  weaponBaseAttackIntervalMs } from '../src/weapons/weaponConfig';

describe('Guardian — both weapons +50% damage at EVERY upgrade level', () => {
  it('keeps both existing Guardian weapon IDs and their old melee attack mechanics', () => {
    expect(HERO_WEAPONS.guardian).toEqual(['sunblade', 'warhammer']);
    expect(WEAPONS.sunblade.attackMode).toBe('melee');
    expect(WEAPONS.warhammer.attackMode).toBe('melee');
    expect(WEAPONS.sunblade.specialEffects).toContain('knockback');
    expect(WEAPONS.warhammer.specialEffects).toContain('ground-crack');
    expect(GUARDIAN_WEAPON_DAMAGE_MULTIPLIER).toBe(1.5);
  });

  it('boosts each old level damage by 50% exactly once, without compounding', () => {
    for (const id of HERO_WEAPONS.guardian) {
      const base = WEAPONS[id];
      for (let level = 1; level <= MAX_WEAPON_LEVEL; level++) {
        const oldDamage = Math.round(base.damage * (1 + 0.12 * (level - 1)) * 10) / 10;
        const expected = Math.round(oldDamage * 1.5 * 10) / 10;
        expect(getWeaponStats(id, level).damage).toBe(expected);
        expect(getWeaponStats(id, level).damage).toBeGreaterThan(oldDamage);
      }
    }
    expect(getWeaponStats('sunblade', 1).damage).toBe(63);
    expect(getWeaponStats('warhammer', 1).damage).toBe(187.5);
    expect(getWeaponStats('warhammer', 20).damage).toBe(615);
    expect(getWeaponStats('sunblade', 20).damage).toBe(206.7);
  });

  it('caps both weapons at level 20 for saved max-level characters', () => {
    for (const id of HERO_WEAPONS.guardian) {
      expect(getWeaponStats(id, MAX_WEAPON_LEVEL)).toEqual(getWeaponStats(id, 999));
      expect(getWeaponStats(id, 1)).toEqual(getWeaponStats(id, -2));
    }
  });
});

describe('Bulwark Hammer upgrades gradually speed up the actual attacks', () => {
  it('starts with its original speed and reaches 1.50 seconds on a base Guardian at level 20', () => {
    expect(getWeaponStats('warhammer', 1).fireRate).toBe(WEAPONS.warhammer.fireRate);
    expect(WARHAMMER_MAX_ATTACK_INTERVAL_MS).toBe(1500);
    const hammer20 = getWeaponStats('warhammer', MAX_WEAPON_LEVEL);
    // This is the exact rate used in WeaponController, including Guardian's
    // native 0.92 attack-speed multiplier, before any run/armor bonuses.
    const actualInterval = fireIntervalMs(
      hammer20.fireRate * HEROES.guardian.stats.attackSpeed);
    expect(actualInterval).toBeCloseTo(1500, 8);
    expect(weaponBaseAttackIntervalMs(hammer20)).toBeCloseTo(1500, 8);
    expect(weaponBaseAttackIntervalMs(getWeaponStats('warhammer', 1))).toBeGreaterThan(2500);
  });

  it('has no plateaus or sudden regressions from upgrades 1 through 20', () => {
    let lastRate=0,lastInterval=Infinity;
    for (let level=1;level<=MAX_WEAPON_LEVEL;level++){
      const config=getWeaponStats('warhammer',level);
      const interval=weaponBaseAttackIntervalMs(config);
      expect(config.fireRate).toBeGreaterThan(lastRate);
      expect(interval).toBeLessThan(lastInterval);
      expect(interval).toBeGreaterThanOrEqual(1500-1e-7);
      lastRate=config.fireRate;
      lastInterval=interval;
    }
  });

  it('keeps Dawnblade and all other weapons original upgrade cadence', () => {
    expect(getWeaponStats('sunblade',20).fireRate).toBe(
      Math.round(WEAPONS.sunblade.fireRate*(1+0.02*19)*100)/100);
    for(const [id,weapon] of Object.entries(WEAPONS)) {
      if (id === 'warhammer') continue;
      for(const level of [1,3,10,20]){
        const extra=level-1;
        expect(getWeaponStats(weapon.id,level).fireRate).toBe(
          Math.round(weapon.fireRate*(1+0.02*extra)*100)/100);
        if (id !== 'sunblade') expect(getWeaponStats(weapon.id,level).damage).toBe(
          Math.round(weapon.damage*(1+0.12*extra)*10)/10);
      }
    }
  });
});

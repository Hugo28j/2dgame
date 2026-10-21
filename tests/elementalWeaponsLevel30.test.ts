import { describe, expect, it } from 'vitest';
import { FLAMETHROWER, flameConeHits } from '../src/weapons/elementalMelee';
import { applyProfileAction, defaultProfile, validateProfile } from '../src/progression/ProgressStore';
import { MAX_WEAPON_LEVEL, WEAPONS, WEAPON_IDS, getWeaponStats,
  weaponBaseAttackIntervalMs } from '../src/weapons/weaponConfig';

describe('Level 30 weapon progression and migration', () => {
  it('extends every weapon to level 30 with extra damage', () => {
    expect(MAX_WEAPON_LEVEL).toBe(30);
    for (const id of WEAPON_IDS) {
      expect(getWeaponStats(id,30).upgradeLevel).toBe(30);
      expect(getWeaponStats(id,999)).toEqual(getWeaponStats(id,30));
      expect(getWeaponStats(id,30).damage).toBeGreaterThan(getWeaponStats(id,20).damage);
      if (id !== 'fireorbs')
        expect(weaponBaseAttackIntervalMs(getWeaponStats(id,30)))
          .toBeLessThan(weaponBaseAttackIntervalMs(getWeaponStats(id,20)));
    }
  });
  it('lets existing level-20 saves upgrade to level 30 without resetting', () => {
    let profile={...defaultProfile(),gold:1000000,weaponLevels:{
      ...defaultProfile().weaponLevels,sunblade:20,
    }};
    profile=validateProfile(profile);
    for(let i=0;i<10;i++)
      profile=applyProfileAction(profile,{type:'upgradeWeapon',id:'sunblade'});
    expect(profile.weaponLevels.sunblade).toBe(30);
    expect(applyProfileAction(profile,{type:'upgradeWeapon',id:'sunblade'})).toEqual(profile);
    expect(validateProfile(profile).weaponLevels.sunblade).toBe(30);
  });
});

describe('Arcane Staff level 20 milestone', () => {
  it('fires two real projectiles per attack starting at level 20', () => {
    expect(getWeaponStats('staff',1).projectileCount).toBe(1);
    expect(getWeaponStats('staff',19).projectileCount).toBe(1);
    expect(getWeaponStats('staff',20).projectileCount).toBe(2);
    expect(getWeaponStats('staff',30).projectileCount).toBe(2);
    expect(getWeaponStats('spellbook',30).projectileCount).toBe(1);
  });
});

describe('Pyromancer Inferno Flamethrower', () => {
  it('replaces Phoenix Orbs with a continuous melee cone and 1-second burning', () => {
    expect(WEAPONS.fireorbs.name).toBe('Inferno Flamethrower');
    expect(WEAPONS.fireorbs.attackMode).toBe('melee');
    expect(WEAPONS.fireorbs.projectileCount).toBe(0);
    expect(WEAPONS.fireorbs.specialEffects).toContain('burn');
    expect(FLAMETHROWER.damageTickMs).toBeLessThan(250);
    expect(FLAMETHROWER.burnTickMs).toBe(1000);
    expect(FLAMETHROWER.burnDurationMs).toBeGreaterThan(FLAMETHROWER.burnTickMs);
  });
  it('scales contact damage from 10 to 100 damage per second, and range from 105 to 180', () => {
    expect(getWeaponStats('fireorbs',1).damage).toBe(10);
    expect(getWeaponStats('fireorbs',30).damage).toBe(100);
    expect(getWeaponStats('fireorbs',1).meleeRange).toBe(105);
    expect(getWeaponStats('fireorbs',30).meleeRange).toBe(180);
    expect(getWeaponStats('fireorbs',20).meleeRange).toBeGreaterThan(105);
  });
  it('damages only enemies in the forward expanding flame cone', () => {
    const origin={x:0,y:0},aim={x:1,y:0};
    expect(flameConeHits(origin,aim,{x:80,y:20},105)).toBe(true);
    expect(flameConeHits(origin,aim,{x:80,y:90},105)).toBe(false);
    expect(flameConeHits(origin,aim,{x:-40,y:0},180)).toBe(false);
    expect(flameConeHits(origin,aim,{x:169,y:35},180)).toBe(true);
    expect(flameConeHits(origin,aim,{x:205,y:0},180)).toBe(false);
  });
});

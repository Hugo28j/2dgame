import { describe, expect, it } from 'vitest';
import { HEROES, HERO_IDS, getHeroStats, heroUpgradeCost } from '../src/heroes/heroConfig';
import {
  applyProfileAction, defaultProfile, validateProfile,
} from '../src/progression/ProgressStore';
import { findChainTargets } from '../src/weapons/chainLightning';
import {
  HERO_WEAPONS, WEAPONS, WEAPON_IDS, getWeaponStats, weaponUpgradeCost,
} from '../src/weapons/weaponConfig';

describe('phase 5 heroes and weapons', () => {
  it('defines seven distinct heroes with positive stats and unlock rules', () => {
    expect(HERO_IDS).toHaveLength(7);
    expect(HEROES.ranger.stats.movementSpeed).toBeGreaterThan(HEROES.guardian.stats.movementSpeed);
    expect(HEROES.guardian.stats.maxHp).toBeGreaterThan(HEROES.mage.stats.maxHp);
    for (const id of HERO_IDS) {
      expect(HEROES[id].stats.maxHp).toBeGreaterThan(0);
      expect(HEROES[id].textureKey).toBeTruthy();
    }
  });
  it('progressively increases hero stats without exceeding the maximum level', () => {
    expect(getHeroStats('ranger', 3).maxHp).toBeGreaterThan(getHeroStats('ranger', 1).maxHp);
    expect(getHeroStats('ranger', 999)).toEqual(getHeroStats('ranger', 50));
    expect(heroUpgradeCost(2)).toBeGreaterThan(heroUpgradeCost(1));
  });
  it('defines two hero-bound weapons per hero with ranged and melee combat', () => {
    expect(WEAPON_IDS).toHaveLength(14);
    for (const id of HERO_IDS) expect(HERO_WEAPONS[id]).toHaveLength(2);
    expect(WEAPONS.crossbow.piercing).toBeGreaterThan(0);
    expect(WEAPONS.daggers.projectileCount).toBe(2);
    expect(WEAPONS.lightning.effect).toBe('chain-lightning');
    expect(WEAPONS.sunblade.attackMode).toBe('melee');
    expect(getWeaponStats('bow', 4).damage).toBeGreaterThan(getWeaponStats('bow', 1).damage);
    expect(getWeaponStats('bow', 100)).toEqual(getWeaponStats('bow', 20));
    expect(weaponUpgradeCost(3)).toBeGreaterThan(weaponUpgradeCost(2));
  });
});

describe('phase 5 progression and persistence', () => {
  it('starts with basic equipment and starter gold', () => {
    const p = defaultProfile();
    expect(p.selectedHero).toBe('guardian');
    expect(p.selectedWeapon).toBe('sunblade');
    expect(p.unlockedHeroes).toEqual(['guardian']);
  });
  it('cannot equip locked gear or spend more than available', () => {
    const p = defaultProfile();
    expect(applyProfileAction(p, { type: 'selectHero', id: 'mage' }).selectedHero).toBe('guardian');
    const spent = applyProfileAction(p, { type: 'unlockHero', id: 'mage' });
    expect(spent).toEqual(p);
    const unlocked = applyProfileAction(p, { type: 'reachRoom', worldId: 1, room: 20 });
    expect(unlocked.gold).toBe(p.gold);
    expect(unlocked.unlockedHeroes).toContain('mage');
    expect(unlocked.unlockedWeapons).toContain('staff');
    const blocked = applyProfileAction(unlocked, { type: 'unlockWeapon', id: 'crossbow' });
    expect(blocked.unlockedWeapons).not.toContain('crossbow');
  });
  it('applies purchased levels only to unlocked items', () => {
    let p = defaultProfile();
    const blocked = applyProfileAction(p, { type: 'upgradeWeapon', id: 'daggers' });
    expect(blocked.weaponLevels.daggers).toBe(1);
    expect(applyProfileAction(p, { type: 'upgradeHero', id: 'guardian' })).toEqual(p);
    p = applyProfileAction(p, { type: 'collectHeroXp', id: 'guardian', amount: 30 });
    expect(p.heroLevels.guardian).toBe(2);
    expect(p.heroXp.guardian).toBe(0);
    expect(p.gold).toBe(150);
    p = applyProfileAction(p, { type: 'upgradeWeapon', id: 'sunblade' });
    expect(p.weaponLevels.sunblade).toBe(2);
    expect(p.gold).toBe(150 - weaponUpgradeCost(1));
  });
  it('restores safe defaults for bad saves and discards unknown unlocks', () => {
    expect(validateProfile(null)).toEqual(defaultProfile());
    const malformed = validateProfile({
      version: 1, gold: -123, selectedHero: 'guardian',
      unlockedHeroes: ['hacker'], selectedWeapon: 'lightning',
      unlockedWeapons: ['hacker'], heroLevels: { ranger: 999 },
      weaponLevels: {},
    });
    expect(malformed.gold).toBe(0);
    expect(malformed.selectedHero).toBe('guardian');
    expect(malformed.selectedWeapon).toBe('sunblade');
    expect(malformed.heroLevels.ranger).toBe(50);
  });
  it('awards nonnegative gold without duplicates from invalid values', () => {
    const p = defaultProfile();
    expect(applyProfileAction(p, { type: 'awardGold', amount: -500 }).gold).toBe(p.gold);
    expect(applyProfileAction(p, { type: 'awardGold', amount: 30 }).gold).toBe(p.gold + 30);
  });
});

describe('chain lightning targeting', () => {
  it('jumps to nearby unique targets, not the starting enemy', () => {
    const initial = { enemyId: 'a', x: 0, y: 0 };
    const chain = findChainTargets(initial, [
      initial, { enemyId: 'b', x: 20, y: 0 },
      { enemyId: 'c', x: 38, y: 0 }, { enemyId: 'far', x: 500, y: 500 },
    ]);
    expect(chain.map(x => x.enemyId)).toEqual(['b', 'c']);
    expect(findChainTargets(initial, [], 2)).toEqual([]);
  });
});

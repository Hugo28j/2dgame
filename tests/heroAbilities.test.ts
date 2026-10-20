import { describe, expect, it } from 'vitest';
import {
  ABILITY_IDS, HERO_ABILITIES, abilityUpgradeCost, getAbilityStats,
} from '../src/abilities/abilityConfig';
import { HERO_IDS } from '../src/heroes/heroConfig';
import { applyProfileAction, defaultProfile, validateProfile } from '../src/progression/ProgressStore';

describe('hero ability progression', () => {
  it('owns three distinct abilities per hero without sharing IDs', () => {
    const assigned = HERO_IDS.flatMap(id => [...HERO_ABILITIES[id]]);
    expect(assigned).toHaveLength(21);
    expect(new Set(assigned).size).toBe(21);
    expect(new Set(assigned)).toEqual(new Set(ABILITY_IDS));
  });

  it('unlocks ability slots at levels 5, 20 and 30', () => {
    const base = { ...defaultProfile(), gold: 10000 };
    const [first, second, third] = HERO_ABILITIES.guardian;
    for (const id of [first, second, third])
      expect(applyProfileAction(base, { type: 'upgradeAbility', id })).toEqual(base);
    for (const [level, active, locked] of [
      [5, first, second], [20, second, third], [30, third, undefined],
    ] as const) {
      const profile = validateProfile({ ...base,
        heroLevels: { ...base.heroLevels, guardian: level } });
      const upgraded = applyProfileAction(profile, { type: 'upgradeAbility', id: active });
      expect(upgraded.abilityLevels[active]).toBe(2);
      expect(upgraded.gold).toBe(profile.gold - abilityUpgradeCost(1));
      if (locked) expect(applyProfileAction(profile, { type: 'upgradeAbility', id: locked })).toEqual(profile);
    }
  });

  it('improves power and cooldown while respecting the maximum level', () => {
    const id = HERO_ABILITIES.pyromancer[1];
    expect(getAbilityStats(id, 10).damage).toBeGreaterThan(getAbilityStats(id, 1).damage);
    expect(getAbilityStats(id, 10).cooldownMs).toBeLessThan(getAbilityStats(id, 1).cooldownMs);
    expect(getAbilityStats(id, 999)).toEqual(getAbilityStats(id, 20));
  });

  it('migrates v3 saves with all ability levels initialized safely', () => {
    const old = { ...defaultProfile(), version: 3 as const, gold: 777 };
    delete (old as Partial<typeof old>).abilityLevels;
    const migrated = validateProfile(old);
    expect(migrated.version).toBe(4);
    expect(migrated.gold).toBe(777);
    for (const id of ABILITY_IDS) expect(migrated.abilityLevels[id]).toBe(1);
  });
});

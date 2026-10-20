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

  it('blocks slot two before hero level 10 and slot three before level 20', () => {
    const base = { ...defaultProfile(), gold: 10000 };
    const [, second, third] = HERO_ABILITIES.guardian;
    expect(applyProfileAction(base, { type: 'upgradeAbility', id: second })).toEqual(base);
    expect(applyProfileAction(base, { type: 'upgradeAbility', id: third })).toEqual(base);

    const level10 = validateProfile({ ...base,
      heroLevels: { ...base.heroLevels, guardian: 10 } });
    const upgradedSecond = applyProfileAction(level10, { type: 'upgradeAbility', id: second });
    expect(upgradedSecond.abilityLevels[second]).toBe(2);
    expect(upgradedSecond.gold).toBe(level10.gold - abilityUpgradeCost(1));
    expect(applyProfileAction(level10, { type: 'upgradeAbility', id: third })).toEqual(level10);

    const level20 = validateProfile({ ...base,
      heroLevels: { ...base.heroLevels, guardian: 20 } });
    expect(applyProfileAction(level20, { type: 'upgradeAbility', id: third })
      .abilityLevels[third]).toBe(2);
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

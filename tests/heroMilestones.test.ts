import { describe, expect, it } from 'vitest';
import { HERO_IDS, MAX_HERO_LEVEL } from '../src/heroes/heroConfig';
import { HERO_ABILITIES, isAbilityUnlocked } from '../src/abilities/abilityConfig';
import { HERO_WEAPONS, isWeaponUnlockedForHero } from '../src/weapons/weaponConfig';
import { applyProfileAction, defaultProfile, heroXpRequirement, validateProfile } from '../src/progression/ProgressStore';

describe('hero 50-level progression milestones', () => {
  it('applies weapon level 10 and ability 5/20/30 gates to all heroes', () => {
    expect(MAX_HERO_LEVEL).toBe(50);
    for (const hero of HERO_IDS) {
      const starter = HERO_WEAPONS[hero][0]!;
      const alternate = HERO_WEAPONS[hero][1]!;
      const [one, two, three] = HERO_ABILITIES[hero];
      expect(isWeaponUnlockedForHero(starter, hero, 1)).toBe(true);
      expect(isWeaponUnlockedForHero(alternate, hero, 9)).toBe(false);
      expect(isWeaponUnlockedForHero(alternate, hero, 10)).toBe(true);
      for (const [ability, level] of [[one, 5], [two, 20], [three, 30]] as const) {
        expect(isAbilityUnlocked(ability, level - 1)).toBe(false);
        expect(isAbilityUnlocked(ability, level)).toBe(true);
      }
    }
  });
  it('unlocks the alternate automatically with XP, without gold spending or swapping weapons', () => {
    const initial = defaultProfile();
    const alternate = HERO_WEAPONS.guardian[1]!;
    expect(initial.unlockedWeapons).not.toContain(alternate);
    expect(applyProfileAction(initial, { type: 'unlockWeapon', id: alternate })).toEqual(initial);
    const totalXp = Array.from({ length: 9 }, (_, i) => heroXpRequirement(i + 1))
      .reduce((sum, n) => sum + n, 0);
    const upgraded = applyProfileAction(initial, { type: 'collectHeroXp', id: 'guardian', amount: totalXp });
    expect(upgraded.heroLevels.guardian).toBe(10);
    expect(upgraded.unlockedWeapons).toContain(alternate);
    expect(upgraded.gold).toBe(initial.gold);
    expect(upgraded.selectedWeapon).toBe(initial.selectedWeapon);
    expect(applyProfileAction(upgraded, { type: 'selectWeapon', id: alternate }).selectedWeapon).toBe(alternate);
  });
  it('honors the new gates when migrating existing saves', () => {
    const base = defaultProfile();
    const alternate = HERO_WEAPONS.guardian[1]!;
    const early = validateProfile({ ...base, unlockedWeapons: ['sunblade', alternate] });
    expect(early.unlockedWeapons).not.toContain(alternate);
    const advanced = validateProfile({
      ...base, unlockedWeapons: ['sunblade'],
      heroLevels: { ...base.heroLevels, guardian: 31 },
      selectedWeapon: alternate,
      selectedWeapons: { ...base.selectedWeapons, guardian: alternate },
    });
    expect(advanced.unlockedWeapons).toContain(alternate);
    expect(advanced.selectedWeapon).toBe(alternate);
    expect(validateProfile({ ...base, heroLevels: { ...base.heroLevels, guardian: 999 } }).heroLevels.guardian).toBe(50);
  });
});

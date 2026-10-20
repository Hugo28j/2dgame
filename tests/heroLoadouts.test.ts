import { describe, expect, it } from 'vitest';
import { HERO_IDS } from '../src/heroes/heroConfig';
import { applyProfileAction, defaultProfile, validateProfile } from '../src/progression/ProgressStore';
import {
  HERO_STARTER_WEAPON, HERO_WEAPONS, WEAPONS, weaponBelongsToHero,
} from '../src/weapons/weaponConfig';
import { isInsideMeleeSwing } from '../src/weapons/meleeCombat';

describe('hero-bound loadouts', () => {
  it('gives every hero two exclusive thematic weapons', () => {
    for (const heroId of HERO_IDS) {
      expect(HERO_WEAPONS[heroId]).toHaveLength(2);
      for (const weaponId of HERO_WEAPONS[heroId]) {
        expect(WEAPONS[weaponId].heroId).toBe(heroId);
        expect(weaponBelongsToHero(weaponId, heroId)).toBe(true);
      }
    }
  });

  it('starts a new profile with the melee Guardian and Dawnblade', () => {
    const profile = defaultProfile();
    expect(profile.selectedHero).toBe('guardian');
    expect(profile.selectedWeapon).toBe('sunblade');
    expect(WEAPONS[profile.selectedWeapon].attackMode).toBe('melee');
  });

  it('unlocks the Mage starter weapon on reaching world-one room 20', () => {
    let profile = applyProfileAction(defaultProfile(), { type: 'reachRoom', worldId: 1, room: 20 });
    profile = applyProfileAction(profile, { type: 'selectHero', id: 'mage' });
    expect(profile.unlockedWeapons).toContain(HERO_STARTER_WEAPON.mage);
    expect(profile.selectedWeapon).toBe('staff');
    expect(profile.selectedWeapons.mage).toBe('staff');
  });

  it('never equips or purchases another hero\'s weapon', () => {
    const profile = applyProfileAction(defaultProfile(), { type: 'awardGold', amount: 500 });
    expect(applyProfileAction(profile, { type: 'unlockWeapon', id: 'crossbow' })).toEqual(profile);
    const tampered = validateProfile({
      ...profile, selectedWeapon: 'bow', selectedWeapons: { ...profile.selectedWeapons, guardian: 'bow' },
      unlockedWeapons: [...profile.unlockedWeapons, 'bow'],
    });
    expect(tampered.selectedWeapon).toBe('sunblade');
  });

  it('remembers one selected weapon for each hero', () => {
    let profile = applyProfileAction(defaultProfile(), { type: 'awardGold', amount: 1000 });
    profile = validateProfile({ ...profile,
      heroLevels: { ...profile.heroLevels, guardian: 10 } });
    profile = applyProfileAction(profile, { type: 'selectWeapon', id: 'warhammer' });
    profile = applyProfileAction(profile, { type: 'unlockHero', id: 'mage' });
    profile = applyProfileAction(profile, { type: 'selectHero', id: 'guardian' });
    expect(profile.selectedWeapon).toBe('warhammer');
  });
});

describe('melee swing geometry', () => {
  const origin = { x: 0, y: 0 };
  const right = { x: 1, y: 0 };

  it('hits targets in range and inside the facing arc', () => {
    expect(isInsideMeleeSwing(origin, right, { x: 50, y: 10 }, 80, Math.PI / 2)).toBe(true);
    expect(isInsideMeleeSwing(origin, right, { x: -20, y: 0 }, 80, Math.PI / 2)).toBe(false);
    expect(isInsideMeleeSwing(origin, right, { x: 90, y: 0 }, 80, Math.PI / 2)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { HERO_IDS } from '../src/heroes/heroConfig';
import { applyProfileAction, defaultProfile, validateProfile } from '../src/progression/ProgressStore';
import { rollEnemyArmor } from '../src/progression/armor';

describe('world one character milestone unlocks', () => {
  it('starts with Guardian first and only Guardian unlocked', () => {
    const profile = defaultProfile();
    expect(HERO_IDS.slice(0, 3)).toEqual(['guardian', 'ranger', 'mage']);
    expect(profile.unlockedHeroes).toEqual(['guardian']);
    expect(applyProfileAction(profile, { type: 'unlockHero', id: 'ranger' })).toEqual(profile);
    expect(applyProfileAction(profile, { type: 'unlockHero', id: 'mage' })).toEqual(profile);
  });
  it('unlocks Ranger at W1 room 10 and Mage at W1 room 20, persistently', () => {
    const initial = defaultProfile();
    const nine = applyProfileAction(initial, { type: 'reachRoom', worldId: 1, room: 9 });
    expect(nine.unlockedHeroes).toEqual(['guardian']);
    const ten = applyProfileAction(nine, { type: 'reachRoom', worldId: 1, room: 10 });
    expect(ten.unlockedHeroes).toContain('ranger');
    expect(ten.unlockedHeroes).not.toContain('mage');
    expect(ten.unlockedWeapons).toContain('bow');
    const twenty = applyProfileAction(ten, { type: 'reachRoom', worldId: 1, room: 20 });
    expect(twenty.unlockedHeroes).toContain('mage');
    expect(twenty.unlockedWeapons).toContain('staff');
    expect(validateProfile(twenty).unlockedHeroes).toContain('mage');
    expect(applyProfileAction(initial, { type: 'reachRoom', worldId: 2, room: 20 }).unlockedHeroes).toEqual(['guardian']);
  });
  it('prevents duplicate armor collection and rejects invalid gear', () => {
    const item = rollEnemyArmor('boss', 0, .5, .5, 'run', 'boss', 'guardian')!;
    const original = defaultProfile();
    const first = applyProfileAction(original, { type: 'collectArmor', item });
    expect(first.armorInventory).toHaveLength(1);
    expect(applyProfileAction(first, { type: 'collectArmor', item })).toEqual(first);
  });
});

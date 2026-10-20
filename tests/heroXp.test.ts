import { describe, expect, it } from 'vitest';
import { applyProfileAction, defaultProfile, heroXpRequirement, validateProfile } from '../src/progression/ProgressStore';
import { xpDropsForEnemy } from '../src/progression/heroXp';

describe('hero XP crystals and permanent progression', () => {
  it('keeps XP on the specific hero and does not spend or award gold', () => {
    const original = defaultProfile();
    const earned = applyProfileAction(original, { type: 'collectHeroXp', id: 'guardian', amount: 15 });
    expect(earned.gold).toBe(original.gold);
    expect(earned.heroXp.guardian).toBe(15);
    expect(earned.heroXp.ranger).toBe(0);
    expect(earned.heroLevels.guardian).toBe(1);
  });
  it('automatically earns multiple levels with overflow XP', () => {
    let profile = defaultProfile();
    profile = applyProfileAction(profile, { type: 'collectHeroXp', id: 'guardian', amount: 100 });
    expect(profile.heroLevels.guardian).toBe(3);
    expect(profile.heroXp.guardian).toBe(100 - heroXpRequirement(1) - heroXpRequirement(2));
    expect(applyProfileAction(profile, { type: 'upgradeHero', id: 'guardian' })).toEqual(profile);
  });
  it('protects locked heroes and retains XP in migrated saves', () => {
    const initial = defaultProfile();
    expect(applyProfileAction(initial, { type: 'collectHeroXp', id: 'mage', amount: 100 })).toEqual(initial);
    const saved = validateProfile({
      ...initial, heroLevels: { ...initial.heroLevels, guardian: 10 },
      heroXp: { ...initial.heroXp, guardian: 125 },
    });
    expect(saved.heroLevels.guardian).toBe(10);
    expect(saved.heroXp.guardian).toBe(125);
    expect(validateProfile({ ...initial, heroXp: undefined }).heroXp.guardian).toBe(0);
  });
  it('drops gems for all enemies, with bosses giving more XP', () => {
    expect(xpDropsForEnemy('slime')).toHaveLength(1);
    expect(xpDropsForEnemy('boss')).toHaveLength(5);
    const total = (kind: 'slime' | 'boss') =>
      xpDropsForEnemy(kind).reduce((sum, value) => sum + value, 0);
    expect(total('boss')).toBeGreaterThan(total('slime'));
  });
});

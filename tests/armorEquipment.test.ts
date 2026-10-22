import { describe, it, expect } from 'vitest';
import { ARMOR_DEFINITIONS, ARMOR_RARITIES, RARITY_CONFIG, armorBonuses,
  armorUpgradeCost, chooseArmorDropHero, rollEnemyArmor } from '../src/progression/armor';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';

const report = (runId: string, victory: boolean) => ({
  worldId: 1 as const, runId, victory, reachedRoom: 1, roomsCleared: 0,
  enemiesDefeated: 1, bossesDefeated: 0, totalDamage: 0, earnedGold: 10,
});
describe('armor equipment progression', () => {
  it('uses 0.5% chance for normal kills and 5% for bosses', () => {
    const drop = (kind: 'normal' | 'boss', chance: number) =>
      rollEnemyArmor(kind, chance, 0, 0, 'run', 'enemy', 'guardian');
    expect(drop('normal', .00499)).toBeDefined();
    expect(drop('normal', .005)).toBeUndefined();
    expect(drop('boss', .04999)).toBeDefined();
    expect(drop('boss', .05)).toBeUndefined();
    expect(ARMOR_DEFINITIONS).toHaveLength(63);
    expect(ARMOR_RARITIES).toHaveLength(5);
  });
  it('chooses equally from owned heroes, never from heroes that are locked', () => {
    const owned = ['guardian', 'ranger', 'mage'] as const;
    const results = Array.from({ length: 300 }, (_, i) =>
      chooseArmorDropHero(owned, (i + 0.5) / 300));
    expect(results.filter(id => id === 'guardian')).toHaveLength(100);
    expect(results.filter(id => id === 'ranger')).toHaveLength(100);
    expect(results.filter(id => id === 'mage')).toHaveLength(100);
    expect(new Set(results)).toEqual(new Set(owned));
    expect(chooseArmorDropHero(['guardian'], .999999)).toBe('guardian');
    expect(chooseArmorDropHero(['guardian', 'ranger'], 0)).toBe('guardian');
    expect(chooseArmorDropHero(['guardian', 'ranger'], .5)).toBe('ranger');
    expect(chooseArmorDropHero([], .5)).toBeUndefined();
    expect(chooseArmorDropHero(owned, Number.NaN)).toBeUndefined();
    expect(chooseArmorDropHero(owned, 1)).toBeUndefined();
    expect(chooseArmorDropHero(['ranger', 'ranger'], .75)).toBe('ranger');
  });

  it('keeps dropped gear bound to the randomly selected owned hero', () => {
    const profile = { ...defaultProfile(), unlockedHeroes: ['guardian', 'ranger'] as
      ReturnType<typeof defaultProfile>['unlockedHeroes'] };
    const selectedOwner = chooseArmorDropHero(profile.unlockedHeroes, .75)!;
    expect(profile.selectedHero).toBe('guardian');
    expect(selectedOwner).toBe('ranger');
    const item = rollEnemyArmor('normal', 0, .3, .8, 'run', 'enemy', selectedOwner)!;
    expect(item.heroId).toBe('ranger');
    expect(item.kind.startsWith('ranger-')).toBe(true);
    const collected = applyProfileAction(profile, { type: 'collectArmor', item });
    expect(collected.armorInventory).toContainEqual(item);
    const equipped = applyProfileAction(collected, { type: 'equipArmor', id: item.id });
    expect(Object.values(equipped.equippedArmor.ranger)).toContain(item.id);
    expect(Object.values(equipped.equippedArmor.guardian)).not.toContain(item.id);
  });

  it('gains armor only when collecting ground loot, never when winning or dying', () => {
    const initial = defaultProfile();
    const item = rollEnemyArmor('boss', 0, .999, 0, 'run', 'enemy', 'guardian')!;
    expect(item.rarity).toBe('legendary');
    expect(initial.armorInventory).toHaveLength(0);
    const victory = applyProfileAction(initial, { type: 'settleRun', report: report('a', true) });
    expect(victory.armorInventory).toHaveLength(0);
    const defeat = applyProfileAction(initial, { type: 'settleRun', report: report('b', false) });
    expect(defeat.armorInventory).toHaveLength(0);
    const collected = applyProfileAction(initial, { type: 'collectArmor', item });
    expect(collected.armorInventory).toHaveLength(1);
    expect(applyProfileAction(collected, { type: 'collectArmor', item })).toEqual(collected);
  });
  it('equips, levels, fuses duplicates, and sells correctly', () => {
    const base = { ...defaultProfile(), gold: 9000 };
    const one = rollEnemyArmor('normal', 0, 0, 0, 'r', 'one', 'guardian')!;
    const two = rollEnemyArmor('normal', 0, 0, 0, 'r', 'two', 'guardian')!;
    let p = { ...base, armorInventory: [one, two] };
    p = applyProfileAction(p, { type: 'equipArmor', id: one.id });
    expect(p.equippedArmor.guardian.helm).toBe(one.id);
    const cost = armorUpgradeCost(one);
    p = applyProfileAction(p, { type: 'upgradeArmor', id: one.id });
    expect(p.armorInventory[0]?.level).toBe(2);
    expect(p.gold).toBe(9000 - cost);
    p = applyProfileAction(p, { type: 'fuseArmor', id: one.id });
    expect(p.armorInventory).toHaveLength(1);
    expect(p.armorInventory[0]?.stars).toBe(1);
    expect(armorBonuses(p.armorInventory, p.equippedArmor.guardian, 'guardian').hp).toBeGreaterThan(0);
    p = applyProfileAction(p, { type: 'sellArmor', id: one.id });
    expect(p.armorInventory).toHaveLength(0);
    expect(p.equippedArmor.guardian.helm).toBeNull();
    expect(p.gold).toBe(9000 - cost + RARITY_CONFIG.common.sell);
  });
  it('keeps identical gear separate per hero and rejects cross-hero fusion', () => {
    const guardian = rollEnemyArmor('normal', 0, 0, 0, 'r', 'g', 'guardian')!;
    const ranger = rollEnemyArmor('normal', 0, 0, 0, 'r', 'rr', 'ranger')!;
    let profile: ReturnType<typeof defaultProfile> = { ...defaultProfile(),
      unlockedHeroes: ['guardian', 'ranger'], armorInventory: [guardian, ranger] };
    profile = applyProfileAction(profile, { type: 'equipArmor', id: guardian.id });
    profile = applyProfileAction(profile, { type: 'equipArmor', id: ranger.id });
    expect(profile.equippedArmor.guardian.helm).toBe(guardian.id);
    expect(profile.equippedArmor.ranger.helm).toBe(ranger.id);
    expect(applyProfileAction(profile, { type: 'fuseArmor', id: guardian.id })).toEqual(profile);
    expect(armorBonuses(profile.armorInventory, profile.equippedArmor.guardian, 'ranger').hp).toBe(0);
  });
  it('provides only percentages and supports three gear slots', () => {
    for (const item of ARMOR_DEFINITIONS) {
      expect(['helm', 'body', 'boots']).toContain(item.slot);
      const armor = { id: item.kind, kind: item.kind, heroId: item.heroId, rarity: 'rare' as const, level: 30, stars: 5 };
      const equipped = { helm: null, body: null, boots: null, [item.slot]: armor.id };
      const bonus = armorBonuses([armor], equipped);
      expect(Object.values(bonus).some(x => x > 0)).toBe(true);
    }
  });
});

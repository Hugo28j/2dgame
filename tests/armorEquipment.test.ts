import { describe, it, expect } from 'vitest';
import { ARMOR_DEFINITIONS, ARMOR_RARITIES, RARITY_CONFIG, armorBonuses,
  armorUpgradeCost, rollArmor } from '../src/progression/armor';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';

const report = (runId: string, victory: boolean) => ({
  worldId: 1 as const, runId, victory, reachedRoom: 1, roomsCleared: 0,
  enemiesDefeated: 1, bossesDefeated: 0, totalDamage: 0, earnedGold: 10,
});
describe('armor equipment progression', () => {
  it('guarantees first win reward and uses independent bonus rates', () => {
    expect(rollArmor(true, .999, .9, .4, 'a')).toBeDefined();
    expect(rollArmor(true, .199, .9, .4, 'a', 'guardian', 1)).toBeDefined();
    expect(rollArmor(true, .2, .9, .4, 'a', 'guardian', 1)).toBeUndefined();
    expect(rollArmor(false, .399, .9, .4, 'a')).toBeDefined();
    expect(rollArmor(false, .4, .9, .4, 'a')).toBeUndefined();
    expect(rollArmor(false, .099, .9, .4, 'a', 'guardian', 1)).toBeDefined();
    expect(rollArmor(false, .1, .9, .4, 'a', 'guardian', 1)).toBeUndefined();
    expect(ARMOR_DEFINITIONS).toHaveLength(63);
    expect(ARMOR_RARITIES).toHaveLength(5);
  });
  it('awards up to two items per unique run with the proper hero owner', () => {
    const initial = defaultProfile();
    expect(initial.armorInventory).toHaveLength(0);
    const first = applyProfileAction(initial, { type: 'settleRun', report: report('a', true),
      heroId: 'guardian', rolls: { drop: .99, rarity: .999, kind: 0 },
      secondRoll: { drop: 0, rarity: 0, kind: 0 } });
    expect(first.armorInventory).toHaveLength(2);
    expect(first.armorInventory[0]?.rarity).toBe('legendary');
    expect(first.armorInventory.every(x => x.heroId === 'guardian')).toBe(true);
    expect(applyProfileAction(first, { type: 'settleRun', report: report('a', true),
      rolls: { drop: 0, rarity: 0, kind: 0 } })).toEqual(first);
  });
  it('equips, levels, fuses duplicates, and sells correctly', () => {
    const base = { ...defaultProfile(), gold: 9000 };
    const one = rollArmor(true, 0, 0, 0, 'one')!;
    const two = rollArmor(true, 0, 0, 0, 'two')!;
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
    expect(p.equippedArmor.helm).toBeNull();
    expect(p.gold).toBe(9000 - cost + RARITY_CONFIG.common.sell);
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

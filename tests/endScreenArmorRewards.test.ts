import { describe, expect, it } from 'vitest';
import { armorRunRewards } from '../src/ui/armorRunRewards';
import { rollEnemyArmor } from '../src/progression/armor';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';

describe('armor rewards shown after each run', () => {
  it('shows an empty state when no gear was picked up', () => {
    expect(armorRunRewards([])).toEqual([]);
  });
  it('shows names and actual rarity for picked up items', () => {
    const common = rollEnemyArmor('boss', 0, 0, 0, 'run-a', 'one', 'guardian')!;
    const legendary = rollEnemyArmor('boss', 0, .999, .5, 'run-a', 'two', 'guardian')!;
    const shown = armorRunRewards([common, legendary]);
    expect(shown).toHaveLength(2);
    expect(shown[0]).toEqual({
      name: 'Guardian Vanguard Helm', rarity: 'Common', color: '#94a3b8', symbol: '♜',
    });
    expect(shown[1]?.rarity).toBe('Legendary');
    expect(shown[1]?.color).toBe('#fbbf24');
  });
  it('does not award ground drops until physically collected', () => {
    const item = rollEnemyArmor('boss', 0, .999, 0, 'run-b', 'enemy', 'guardian')!;
    const before = defaultProfile();
    expect(before.armorInventory).toHaveLength(0);
    expect(armorRunRewards([])).toHaveLength(0);
    const after = applyProfileAction(before, { type: 'collectArmor', item });
    expect(after.armorInventory.some(x => x.id === item.id)).toBe(true);
    expect(armorRunRewards([item])).toHaveLength(1);
  });
});

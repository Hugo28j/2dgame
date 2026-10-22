import { describe, expect, it } from 'vitest';
import { planChestReel } from '../src/ui/chestReel';
import { SHOP_CHESTS, rollChestArmor } from '../src/ui/shopCatalog';

describe('uninterrupted vertical chest conveyor', () => {
  const chest = SHOP_CHESTS[2]!;
  const winner = rollChestArmor(chest, ['guardian', 'mage'], {
    rarity: .99, hero: .1, kind: .1,
  }, 'chest-winner-0123456789')!;

  it('keeps many slots ABOVE AND BELOW the chosen prize when the belt stops', () => {
    const plan = planChestReel(chest, ['guardian', 'mage'], winner, () => .13);
    expect(plan.winnerIndex).toBeGreaterThanOrEqual(30);
    expect(plan.items[plan.winnerIndex]).toBe(winner);
    expect(plan.items.length - plan.winnerIndex - 1).toBeGreaterThanOrEqual(10);
    // Three other cards remain visible above and below the pointer.
    expect(plan.items[plan.winnerIndex - 3]?.id).not.toBe(winner.id);
    expect(plan.items[plan.winnerIndex + 3]?.id).not.toBe(winner.id);
    // The belt starts at position 4, so it never reveals its leading edge either.
    expect(plan.items[0]?.id).not.toBe(winner.id);
    expect(plan.items[4]).toBeDefined();
  });

  it('shows only armor for heroes already owned, even in decoration after the reward', () => {
    const plan = planChestReel(chest, ['guardian'], winner, () => .9);
    for (const item of plan.items) {
      expect(item.heroId).toBe('guardian');
    }
    expect(plan.items.at(-1)?.id).not.toBe(winner.id);
  });

  it('keeps the purchased item unchanged and stops at one unique prize index', () => {
    const snapshots = [0.1, 0.45, 0.89];
    let idx = 0;
    const plan = planChestReel(chest, ['guardian', 'mage'], winner,
      () => snapshots[idx++ % snapshots.length]!, 8, 8);
    expect(plan.items[plan.winnerIndex]).toBe(winner);
    expect(plan.items.filter(item => item.id === winner.id)).toHaveLength(1);
    expect(plan.items).toHaveLength(17);
    expect(plan.winnerIndex).toBe(8);
    expect(plan.items[plan.winnerIndex + 1]?.id).not.toBe(winner.id);
  });

  it('clamps short requested strips so the winner is never at either edge', () => {
    const plan = planChestReel(chest, ['guardian'], winner, () => .2, 0, 0);
    expect(plan.winnerIndex).toBe(4);
    expect(plan.items).toHaveLength(9);
    expect(plan.items[0]).toBeDefined();
    expect(plan.items.at(-1)).toBeDefined();
  });
});

import { describe, expect, it } from 'vitest';
import { RunUpgradeDeck } from '../src/progression/runUpgrades';

describe('weapon-specific run upgrades', () => {
  it('never offers projectile-only upgrades to melee users', () => {
    const deck = new RunUpgradeDeck(() => 0.42);
    for (let i = 0; i < 12; i++) {
      const ids = deck.offer(true, 'melee').map(card => card.id);
      expect(ids).not.toContain('projectile');
      expect(ids).not.toContain('piercing');
    }
  });
  it('never offers melee-only upgrades to projectile users', () => {
    const deck = new RunUpgradeDeck(() => 0.25);
    for (let i = 0; i < 12; i++) {
      const ids = deck.offer(true, 'projectile').map(card => card.id);
      expect(ids).not.toContain('meleeRange');
      expect(ids).not.toContain('meleeStun');
    }
  });
  it('contains rare range extension and epic 0.5 second stun for melee', async () => {
    const { RUN_UPGRADES } = await import('../src/progression/runUpgrades');
    expect(RUN_UPGRADES.find(upgrade => upgrade.id === 'meleeRange')?.rarity).toBe('rare');
    expect(RUN_UPGRADES.find(upgrade => upgrade.id === 'meleeStun')?.rarity).toBe('epic');
  });
});

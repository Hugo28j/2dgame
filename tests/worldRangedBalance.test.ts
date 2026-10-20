import { describe, expect, it } from 'vitest';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { getWorld } from '../src/worlds/worldConfig';

describe('world-specific ranged enemy balance', () => {
  it('raises Frozen Hollow Frost Ranger health by 50% and damage by 100%', () => {
    for (const room of [1, 7, 17, 29]) {
      const enemy = getEnemyStatsForRoom('archer', room, 2);
      const baselineHp = Math.round(54 * (1 + (room - 1) * .08) * getWorld(2).hpMultiplier);
      const baselineDmg = Math.round(12 * (1 + (room - 1) * .05) * getWorld(2).damageMultiplier);
      expect(enemy.maxHp).toBe(Math.round(54 * 1.5 * (1 + (room - 1) * .08) * getWorld(2).hpMultiplier));
      expect(enemy.damage).toBe(Math.round(12 * 2 * (1 + (room - 1) * .05) * getWorld(2).damageMultiplier));
      expect(enemy.maxHp).toBeGreaterThan(baselineHp);
      expect(enemy.damage).toBeGreaterThan(baselineDmg);
    }
  });
  it('doubles Willow Wisp HP in world one without changing its damage', () => {
    for (const room of [23, 24, 29]) {
      const enemy = getEnemyStatsForRoom('mage', room, 1);
      expect(enemy.maxHp).toBe(Math.round(68 * 2 * (1 + (room - 1) * .08)));
      expect(enemy.damage).toBe(Math.round(14 * (1 + (room - 1) * .05)));
    }
  });
  it('does not apply the buffs to corresponding kinds in other worlds', () => {
    const other = getEnemyStatsForRoom('archer', 12, 1);
    expect(other.maxHp).toBe(Math.round(54 * (1 + 11 * .08)));
    expect(other.damage).toBe(Math.round(12 * (1 + 11 * .05)));
  });
});

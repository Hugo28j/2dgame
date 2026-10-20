import { describe, expect, it } from 'vitest';
import { getEnemyStatsForRoom, getSlimeStatsForRoom } from '../src/enemies/enemyConfig';
import { getWorldBossName } from '../src/worlds/worldConfig';
import {
  BRAMBLE_GUNNER_HP_MULTIPLIER, CHARGER_DASH, WORLD1_MOSSLING_SPEED_MULTIPLIER,
} from '../src/enemies/enemyBalance';

describe('world-1 Bramble Gunner health balance', () => {
  it('has exactly 30% less HP, without reducing Bloom Sentinel or other worlds', () => {
    expect(getWorldBossName(1, 15, 0)).toBe('Bramble Gunner');
    expect(getWorldBossName(1, 15, 1)).toBe('Bloom Sentinel');
    const bramble = getEnemyStatsForRoom('boss', 15, 1, 0);
    const bloom = getEnemyStatsForRoom('boss', 15, 1, 1);
    expect(BRAMBLE_GUNNER_HP_MULTIPLIER).toBe(0.7);
    expect(bramble.maxHp).toBe(Math.round(bloom.maxHp * 0.7));
    expect(bramble.damage).toBe(bloom.damage);
    expect(bramble.attackIntervalMs).toBe(bloom.attackIntervalMs);

    const frozenGunner = getEnemyStatsForRoom('boss', 15, 2, 0);
    const frozenSentinel = getEnemyStatsForRoom('boss', 15, 2, 1);
    expect(frozenGunner.maxHp).toBe(frozenSentinel.maxHp);
    expect(getEnemyStatsForRoom('boss', 10, 1).maxHp).toBeGreaterThan(0);
    expect(getEnemyStatsForRoom('boss', 20, 1).maxHp).toBeGreaterThan(bloom.maxHp);
  });
});

describe('Mossling movement speed', () => {
  it('increases ordinary slimes by exactly 25% in world 1 but not in later worlds', () => {
    expect(WORLD1_MOSSLING_SPEED_MULTIPLIER).toBe(1.25);
    expect(getSlimeStatsForRoom(1, 1).movementSpeed).toBe(140);
    expect(getSlimeStatsForRoom(4, 1).movementSpeed).toBe(140);
    expect(getSlimeStatsForRoom(12, 1).movementSpeed).toBe(140);
    expect(getSlimeStatsForRoom(1, 2).movementSpeed).toBe(116);
    expect(getEnemyStatsForRoom('charger', 12, 1).movementSpeed).toBe(94);
  });
});

describe('small charger rushes', () => {
  it('increases dash velocity and distance, with a matching warning and shorter windup', () => {
    const oldSpeed = 430, oldDurationMs = 360;
    expect(CHARGER_DASH.speed).toBeGreaterThan(oldSpeed);
    expect(CHARGER_DASH.durationMs).toBeGreaterThan(oldDurationMs);
    expect(CHARGER_DASH.distance).toBeCloseTo(
      CHARGER_DASH.speed * CHARGER_DASH.durationMs / 1000,
    );
    expect(CHARGER_DASH.distance).toBeGreaterThan(oldSpeed * oldDurationMs / 1000 * 1.3);
    expect(CHARGER_DASH.telegraphMs).toBeLessThan(540);
    expect(CHARGER_DASH.rechargeMs).toBeLessThan(2300);
  });
});

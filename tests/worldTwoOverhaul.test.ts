import { describe, expect, it } from 'vitest';
import { getEnemyStatsForRoom, getEnemyKindForRoom, WORLD2_UNLOCK_ROOMS } from '../src/enemies/enemyConfig';
import { FROZEN_BALANCE, glacierBossSlot } from '../src/enemies/frozenBalance';
import { getRoomDefinition } from '../src/rooms/roomConfig';
import { getWorldBossName } from '../src/worlds/worldConfig';

describe('Frozen Hollow 2026 balance', () => {
  it('doubles previously buffed archer HP and damage again', () => {
    const s = getEnemyStatsForRoom('archer', 1, 2);
    expect(s.maxHp).toBe(Math.round(54 * 1.5 * 2 * 1.35));
    expect(s.damage).toBe(Math.round(12 * 2 * 2 * 1.2));
    expect(getEnemyStatsForRoom('archer', 1, 1).maxHp).not.toBe(s.maxHp);
  });
  it('triples Golem HP, doubles speed and multiplies shotgunner HP sixfold', () => {
    expect(getEnemyStatsForRoom('tank', 16, 2).maxHp)
      .toBe(Math.round(235 * 3 * (1 + 15 * .08) * 1.35));
    expect(getEnemyStatsForRoom('tank', 16, 2).movementSpeed)
      .toBe(Math.round(56 * 1.04 * 2));
    expect(getEnemyStatsForRoom('charger', 26, 2).maxHp)
      .toBe(Math.round(110 * 6 * (1 + 25 * .08) * 1.35));
  });
  it('raises Glacier Warden HP +200% and Snow Sentinel +300%', () => {
    expect(getEnemyStatsForRoom('boss', 5, 2, 0).maxHp)
      .toBe(Math.round(880 * (1 + 4 * .08) * 1.35 * 3));
    expect(getEnemyStatsForRoom('boss', 15, 2, 1).maxHp)
      .toBe(Math.round(880 * (1 + 14 * .08) * (1 + 2 * .09) * 1.35 * 4));
  });
  it('has Snow Sentinel alone and keeps level introductions and ranger retirement', () => {
    expect(getRoomDefinition(15, 2).enemyCount).toBe(1);
    expect(glacierBossSlot(15)).toBe(1);
    expect(getWorldBossName(2, 15)).toBe('Snow Sentinel');
    expect(WORLD2_UNLOCK_ROOMS.tank).toBe(16);
    expect(WORLD2_UNLOCK_ROOMS.bomber).toBe(21);
    expect(WORLD2_UNLOCK_ROOMS.charger).toBe(26);
    for (const [kind, room] of [['tank',16],['bomber',21],['charger',26]] as const)
      expect(getEnemyKindForRoom(room,0,2)).toBe(kind);
    for (let room=21;room<=30;room++) {
      if (room%5===0) continue;
      for(let i=0;i<50;i++) expect(getEnemyKindForRoom(room,i,2)).not.toBe('archer');
    }
  });
  it('uses ten ceiling snowballs per second and twenty-second 4/6 Golem waves', () => {
    expect(FROZEN_BALANCE.snowballsPerSecond).toBe(10);
    expect(FROZEN_BALANCE.sentinelSummonIntervalMs).toBe(20000);
    expect(FROZEN_BALANCE.sentinelPhaseOneCount).toBe(4);
    expect(FROZEN_BALANCE.sentinelPhaseTwoCount).toBe(6);
    expect(FROZEN_BALANCE.snowballWallFragments).toBe(5);
  });
});

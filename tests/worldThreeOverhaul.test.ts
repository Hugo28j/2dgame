import { describe, expect, it } from 'vitest';
import { getEnemyKindForRoom, getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { EMBER_ATTACKS, EMBER_ROSTER, EMBER_UNLOCK_ROOMS } from '../src/enemies/emberWastes';
import { getWorldCharacterRoster } from '../src/enemies/worldCharacters';

describe('Ember Wastes normal-mob overhaul', () => {
  it('has six unique fire characters and no inherited display names', () => {
    const roster = getWorldCharacterRoster(3);
    expect(roster.map(enemy => enemy.name)).toEqual([
      'Ash Crawler', 'Furnace Breather', 'Blazehound',
      'Cinder Warlock', 'Magma Bulwark', 'Bombardier Imp',
    ]);
    expect(new Set(roster.map(enemy => enemy.textureKey)).size).toBe(6);
  });

  it('introduces every new mob at its configured room and preserves bosses', () => {
    for (const [kind, room] of Object.entries(EMBER_UNLOCK_ROOMS)) {
      expect(getEnemyKindForRoom(room, 0, 3)).toBe(kind);
    }
    for (const room of [5, 10, 15, 20, 25, 30]) {
      expect(getEnemyKindForRoom(room, 0, 3)).toBe('boss');
    }
    const lateRoster = new Set(Array.from({ length: 180 }, (_, index) =>
      getEnemyKindForRoom(29, index, 3)));
    expect(lateRoster).toEqual(new Set(Object.keys(EMBER_ROSTER)));
  });

  it('uses dedicated balanced stats and readable fire attack timing', () => {
    expect(getEnemyStatsForRoom('charger', 18, 3).movementSpeed)
      .toBeGreaterThan(getEnemyStatsForRoom('slime', 18, 3).movementSpeed);
    expect(getEnemyStatsForRoom('archer', 18, 3).attackIntervalMs).toBeLessThan(500);
    expect(EMBER_ATTACKS.houndTrailSpacingMs).toBeLessThan(EMBER_ATTACKS.houndTrailDurationMs);
    expect(EMBER_ATTACKS.bomberWindupMs).toBeGreaterThanOrEqual(800);
  });
});

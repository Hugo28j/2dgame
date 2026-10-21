import { describe, expect, it } from 'vitest';
import { FROZEN_EARLY, canSummonFrostMinions } from '../src/enemies/frozenEarlyGame';
import { getEnemyKindForRoom } from '../src/enemies/enemyConfig';
import { getWorldCharacter } from '../src/enemies/worldCharacters';
import { RoomProgress } from '../src/rooms/RoomProgress';

describe('Frozen Hollow rooms 1-10', () => {
  it('starts with shooters, then introduces ice witches from room 3', () => {
    for (const room of [1, 2]) {
      for (let slot = 0; slot < 12; slot++) {
        expect(getEnemyKindForRoom(room, slot, 2)).toBe('archer');
      }
    }
    for (const room of [3, 4, 6, 7, 8, 9]) {
      const roster = Array.from({length: 16}, (_, slot) => getEnemyKindForRoom(room, slot, 2));
      expect(roster[0]).toBe('mage');
      expect(roster).toContain('archer');
      expect([...new Set(roster)].sort()).toEqual(['archer', 'mage']);
    }
    expect(getEnemyKindForRoom(5, 0, 2)).toBe('boss');
    expect(getEnemyKindForRoom(10, 0, 2)).toBe('boss');
    expect(getWorldCharacter(2, 'mage', 3).name).toBe('Frost Witch');
    expect(getWorldCharacter(2, 'mage', 15).name).toBe('Aurora Witch');
  });

  it('preserves world-1 and other worlds enemy unlock progression', () => {
    for (const world of [1, 4, 5] as const) {
      expect(getEnemyKindForRoom(1, 0, world)).toBe('slime');
      expect(getEnemyKindForRoom(3, 0, world)).toBe('slime');
      if (world === 1) expect(getEnemyKindForRoom(4, 0, world)).toBe('archer');
      else expect(getEnemyKindForRoom(7, 0, world)).toBe('archer');
    }
    expect(getEnemyKindForRoom(1, 0, 3)).toBe('slime');
    expect(getEnemyKindForRoom(3, 0, 3)).toBe('archer');
    expect(getEnemyKindForRoom(12, 0, 2)).toBe('slime');
  });

  it('witch summons two melee enemies every five seconds with active limits', () => {
    expect(FROZEN_EARLY.witchSummonIntervalMs).toBe(5000);
    expect(FROZEN_EARLY.witchSummonCount).toBe(2);
    expect(canSummonFrostMinions(0, 0, 2)).toBe(true);
    expect(canSummonFrostMinions(10, 4, 2)).toBe(true);
    expect(canSummonFrostMinions(11, 4, 2)).toBe(false);
    expect(canSummonFrostMinions(8, 6, 2)).toBe(false);
  });

  it('does not open a door until all newly summoned melee enemies die', () => {
    const room = new RoomProgress(30);
    room.startRoom(1);
    room.addEnemies(2);
    expect(room.registerEnemyDefeated()).toBe(false);
    expect(room.doorOpen).toBe(false);
    expect(room.registerEnemyDefeated()).toBe(false);
    expect(room.registerEnemyDefeated()).toBe(true);
    room.addEnemies(2);
    expect(room.doorOpen).toBe(true);
  });

  it('applies temporary chill on ranger hit and frost freeze after witch explosion', () => {
    expect(FROZEN_EARLY.chillSpeedFactor).toBeLessThan(1);
    expect(FROZEN_EARLY.chillSpeedFactor).toBeGreaterThan(0);
    expect(FROZEN_EARLY.chillDurationMs).toBeGreaterThan(500);
    expect(FROZEN_EARLY.freezeDurationMs).toBeGreaterThan(2000);
    expect(FROZEN_EARLY.witchOrbRadius).toBeGreaterThan(40);
  });
});

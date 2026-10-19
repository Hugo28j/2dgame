import { describe, expect, it } from 'vitest';
import { ROOM_LAYOUTS, CHAPTER_ROOM_COUNT, getRoomDefinition, isSpawnSafe,
  getEnemyCountForRoom, SAFE_SPAWN_DISTANCE } from '../src/rooms/roomConfig';
import { roomClearHealing } from '../src/progression/roomHealing';

describe('extended room layouts', () => {
  it('contains 21 distinct room patterns with unique ids', () => {
    expect(ROOM_LAYOUTS).toHaveLength(21);
    expect(new Set(ROOM_LAYOUTS.map(layout => layout.id)).size).toBe(21);
  });

  it('visits all 21 patterns during the regular rooms of one 50-room campaign', () => {
    const ids = new Set<string>();
    let previous = '';
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const definition = getRoomDefinition(room);
      if (definition.isBossRoom) {
        expect(definition.layout.id).toBe('open-court');
        continue;
      }
      expect(definition.layout.id).not.toBe(previous);
      previous = definition.layout.id;
      ids.add(definition.layout.id);
    }
    expect(ids.size).toBe(21);
  });

  it('never puts player, enemies, or new obstacles in impossible positions', () => {
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const definition = getRoomDefinition(room);
      const { bounds, playerSpawn, obstacles } = definition.layout;
      expect(definition.enemySpawns).toHaveLength(definition.enemyCount);
      if (!definition.isBossRoom) {
        expect(definition.enemyCount).toBe(getEnemyCountForRoom(room));
      }
      for (const obstacle of obstacles) {
        expect(obstacle.x - obstacle.width / 2).toBeGreaterThan(bounds.x);
        expect(obstacle.x + obstacle.width / 2).toBeLessThan(bounds.x + bounds.width);
        expect(obstacle.y - obstacle.height / 2).toBeGreaterThan(bounds.y);
        expect(obstacle.y + obstacle.height / 2).toBeLessThan(bounds.y + bounds.height);
        expect(Math.abs(playerSpawn.x - obstacle.x) > obstacle.width / 2 + 24 ||
          Math.abs(playerSpawn.y - obstacle.y) > obstacle.height / 2 + 24).toBe(true);
      }
      for (const point of definition.enemySpawns) {
        expect(isSpawnSafe(point, definition.layout, SAFE_SPAWN_DISTANCE)).toBe(true);
      }
    }
  });
});

describe('room completion regeneration', () => {
  it('gives regular rooms small predictable recovery and scales every ten rooms', () => {
    expect(roomClearHealing(1, 1, 100).amount).toBe(6);
    expect(roomClearHealing(2, 1, 100).amount).toBe(6);
    expect(roomClearHealing(11, 1, 100).amount).toBe(7);
    expect(roomClearHealing(21, 1, 100).amount).toBe(8);
    expect(roomClearHealing(31, 1, 100).amount).toBe(9);
    expect(roomClearHealing(41, 1, 100).amount).toBe(10);
  });

  it('rewards every third room and every boss, with combined bonus capped at 30 percent', () => {
    const milestone = roomClearHealing(3, 5, 100);
    expect(milestone.milestone).toBe(true);
    expect(milestone.amount).toBe(14);
    const boss = roomClearHealing(5, 5, 100);
    expect(boss.boss).toBe(true);
    expect(boss.amount).toBe(20);
    const both = roomClearHealing(30, 5, 100);
    expect(both.boss).toBe(true);
    expect(both.milestone).toBe(true);
    expect(both.percent).toBeCloseTo(0.30);
    expect(both.amount).toBe(30);
  });

  it('heals only missing HP, never overheals or revives a defeated character', () => {
    expect(roomClearHealing(15, 98, 100).amount).toBe(2);
    expect(roomClearHealing(25, 100, 100).amount).toBe(0);
    expect(roomClearHealing(25, 0, 100).amount).toBe(0);
    expect(roomClearHealing(25, -1, 100).amount).toBe(0);
    expect(roomClearHealing(25, 30, 0).amount).toBe(0);
    expect(roomClearHealing(0, 30, 100).amount).toBe(0);
    expect(roomClearHealing(NaN, 30, 100).amount).toBe(0);
    expect(roomClearHealing(1, NaN, 100).amount).toBe(0);
  });

  it('does not scale indefinitely beyond the 50-room design', () => {
    expect(roomClearHealing(101, 1, 100).percent).toBeLessThanOrEqual(0.3);
    expect(roomClearHealing(101, 1, 100).amount).toBeLessThanOrEqual(30);
  });
});

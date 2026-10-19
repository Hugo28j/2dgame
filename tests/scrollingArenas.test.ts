import { describe, expect, it } from 'vitest';
import { ENEMY_UNLOCK_ROOMS, getEnemyKindForRoom } from '../src/enemies/enemyConfig';
import { targetArenaScroll } from '../src/rooms/cameraFollow';
import {
  CHAPTER_ROOM_COUNT, ROOM_LAYOUTS, SAFE_SPAWN_DISTANCE,
  getArenaBounds, getRoomDefinition, getEnemyCountForRoom, isSpawnSafe,
} from '../src/rooms/roomConfig';

describe('progressive enemy unlocks', () => {
  it('starts only with ordinary slimes, then introduces tougher enemies across the campaign', () => {
    for (let room = 1; room <= 6; room++) {
      if (room % 5 === 0) continue;
      for (let i = 0; i < 60; i++) expect(getEnemyKindForRoom(room, i)).toBe('slime');
    }
    const unlocks = [
      ['archer', 7], ['charger', 12], ['tank', 17],
      ['mage', 23], ['bomber', 29],
    ] as const;
    for (const [kind, firstRoom] of unlocks) {
      expect(ENEMY_UNLOCK_ROOMS[kind]).toBe(firstRoom);
      expect(getEnemyKindForRoom(firstRoom, 0)).toBe(kind);
      for (let room = 1; room < firstRoom; room++) {
        if (room % 5 === 0) continue;
        for (let index = 0; index < 40; index++) {
          expect(getEnemyKindForRoom(room, index)).not.toBe(kind);
        }
      }
    }
  });

  it('provides increasingly varied and difficult rosters in late rooms', () => {
    const early = new Set(Array.from({ length: 100 }, (_, i) => getEnemyKindForRoom(8, i)));
    const late = new Set(Array.from({ length: 100 }, (_, i) => getEnemyKindForRoom(49, i)));
    expect(early).toEqual(new Set(['slime', 'archer']));
    expect(late).toEqual(new Set(['slime', 'archer', 'charger', 'tank', 'mage', 'bomber']));
    expect(getEnemyCountForRoom(49)).toBeGreaterThan(getEnemyCountForRoom(10));
    expect(getEnemyCountForRoom(49)).toBeLessThanOrEqual(32);
    for (let room = 1; room < CHAPTER_ROOM_COUNT; room++) {
      expect(getEnemyCountForRoom(room + 1)).toBeGreaterThanOrEqual(getEnemyCountForRoom(room));
    }
  });
});

describe('scrollable procedural arenas', () => {
  it('offers at least nine distinct arena layouts', () => {
    expect(new Set(ROOM_LAYOUTS.map(layout => layout.id)).size).toBeGreaterThanOrEqual(9);
  });

  it('grows chamber dimensions without ever shrinking them and uses maps bigger than the screen', () => {
    for (let room = 2; room <= CHAPTER_ROOM_COUNT; room++) {
      expect(getArenaBounds(room).width).toBeGreaterThanOrEqual(getArenaBounds(room - 1).width);
      expect(getArenaBounds(room).height).toBeGreaterThanOrEqual(getArenaBounds(room - 1).height);
    }
    expect(getArenaBounds(1).height).toBeLessThan(844);
    expect(getArenaBounds(50).height).toBeGreaterThan(1300);
    expect(getArenaBounds(50).width).toBeGreaterThan(700);
  });

  it('places every player, obstacle and enemy spawn safely across all fifty chambers', () => {
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const definition = getRoomDefinition(room);
      const { bounds, playerSpawn, obstacles } = definition.layout;
      expect(definition.enemySpawns).toHaveLength(definition.enemyCount);
      expect(playerSpawn.x).toBeGreaterThan(bounds.x + 25);
      expect(playerSpawn.y).toBeLessThan(bounds.y + bounds.height - 20);
      for (const obstacle of obstacles) {
        expect(obstacle.x - obstacle.width / 2).toBeGreaterThan(bounds.x);
        expect(obstacle.x + obstacle.width / 2).toBeLessThan(bounds.x + bounds.width);
        expect(obstacle.y - obstacle.height / 2).toBeGreaterThan(bounds.y);
        expect(obstacle.y + obstacle.height / 2).toBeLessThan(bounds.y + bounds.height);
        expect(Math.abs(playerSpawn.x - obstacle.x) > obstacle.width / 2 + 24 ||
          Math.abs(playerSpawn.y - obstacle.y) > obstacle.height / 2 + 24).toBe(true);
      }
      for (const spawn of definition.enemySpawns) {
        expect(isSpawnSafe(spawn, definition.layout, SAFE_SPAWN_DISTANCE)).toBe(true);
      }
      for (let i = 0; i < definition.enemySpawns.length; i++) {
        for (let j = i + 1; j < definition.enemySpawns.length; j++) {
          const first = definition.enemySpawns[i]!;
          const second = definition.enemySpawns[j]!;
          expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThanOrEqual(55);
        }
      }
    }
  });

  it('keeps the camera still for small arenas and follows a player across bigger worlds', () => {
    const first = getRoomDefinition(1).layout;
    expect(targetArenaScroll(first.playerSpawn.x, first.playerSpawn.y, first.bounds))
      .toEqual({ x: 0, y: 0 });
    const large = getRoomDefinition(50).layout.bounds;
    const start = targetArenaScroll(large.x + 55, large.y + 65, large);
    const middle = targetArenaScroll(large.x + large.width / 2,
      large.y + large.height / 2, large);
    const end = targetArenaScroll(large.x + large.width - 55,
      large.y + large.height - 54, large);
    expect(start).toEqual({ x: 0, y: 0 });
    expect(middle.x).toBeGreaterThan(0);
    expect(middle.y).toBeGreaterThan(0);
    expect(end.x).toBeGreaterThan(middle.x);
    expect(end.y).toBeGreaterThan(middle.y);
    expect(end.x).toBeLessThanOrEqual(large.x + large.width + 18 - 390);
    expect(end.y).toBeLessThanOrEqual(large.y + large.height + 204 - 844);
  });

  it('keeps ten boss rooms with room-filling arenas', () => {
    for (let room = 5; room <= 50; room += 5) {
      const definition = getRoomDefinition(room);
      expect(definition.isBossRoom).toBe(true);
      expect(definition.enemySpawns).toHaveLength(1);
      expect(definition.layout.bounds).toEqual(getArenaBounds(room));
    }
  });
});

import { describe, expect, it } from 'vitest';
import { chooseDistantSpawnIndices, spawnWaveSettings } from '../src/rooms/spawnWaves';
import { BOSS_ROOM_INTERVAL, CHAPTER_ROOM_COUNT, getEnemyCountForRoom,
  getMinimumSpawnDistance, getRoomDefinition, isSpawnSafe } from '../src/rooms/roomConfig';

describe('late-room spawn counts and starting distance', () => {
  it('increases from 3 to 31 normal enemies, retaining exactly one boss per fifth room', () => {
    expect(getEnemyCountForRoom(1)).toBe(3);
    expect(getEnemyCountForRoom(20)).toBeGreaterThan(10);
    expect(getEnemyCountForRoom(49)).toBe(31);
    expect(getEnemyCountForRoom(200)).toBe(32);
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const result = getRoomDefinition(room);
      expect(result.enemySpawns).toHaveLength(result.enemyCount);
      expect(result.enemyCount).toBe(room % BOSS_ROOM_INTERVAL === 0
        ? 1 : getEnemyCountForRoom(room));
    }
  });

  it('pushes later initial spawns at least 340px away without ever spawning in obstacles', () => {
    expect(getMinimumSpawnDistance(1)).toBe(140);
    expect(getMinimumSpawnDistance(49)).toBe(340);
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const result = getRoomDefinition(room);
      if (result.isBossRoom) continue;
      for (const p of result.enemySpawns) {
        expect(Math.hypot(p.x - result.layout.playerSpawn.x,
          p.y - result.layout.playerSpawn.y))
          .toBeGreaterThanOrEqual(getMinimumSpawnDistance(room));
        expect(isSpawnSafe(p, result.layout, getMinimumSpawnDistance(room))).toBe(true);
      }
    }
  });

  it('does not cluster thirty enemies into a small corner of the large arena', () => {
    for (const room of [29, 39, 44, 49]) {
      const points = getRoomDefinition(room).enemySpawns;
      const xs = points.map(p => p.x), ys = points.map(p => p.y);
      const bounds = getRoomDefinition(room).layout.bounds;
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(bounds.width * 0.5);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(bounds.height * 0.48);
    }
  });
});

describe('room start spawn policy', () => {
  it('spawns every planned enemy immediately for all 50 rooms', () => {
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const enemyCount = getRoomDefinition(room).enemyCount;
      const settings = spawnWaveSettings(room, enemyCount);
      expect(settings.initial).toBe(enemyCount);
      expect(settings.batchSize).toBe(enemyCount);
      expect(settings.maxActive).toBe(enemyCount);
      expect(settings.intervalMs).toBe(0);
    }
  });

  it('chooses opposite farthest locations if the player moves during a fight', () => {
    const points = [100, 270, 470, 690].map(x => ({ x, y: 200 }));
    const indices = [0, 1, 2, 3];
    const fromLeft = chooseDistantSpawnIndices(points, indices, { x: 90, y: 200 }, 1, 250);
    const fromRight = chooseDistantSpawnIndices(points, indices, { x: 700, y: 200 }, 1, 250);
    expect(fromLeft).toEqual([3]);
    expect(fromRight).toEqual([0]);
  });

  it('avoids occupied points and never repeats selected indices across waves', () => {
    const room = getRoomDefinition(49);
    let remaining = room.enemySpawns.map((_, i) => i);
    const selected: number[] = [];
    const player = room.layout.playerSpawn;
    while (remaining.length > 0) {
      const wave = chooseDistantSpawnIndices(room.enemySpawns, remaining, player, 6, 360);
      expect(wave.length).toBeGreaterThan(0);
      expect(wave.length).toBeLessThanOrEqual(6);
      selected.push(...wave);
      const consumed = new Set(wave);
      remaining = remaining.filter(i => !consumed.has(i));
    }
    expect(new Set(selected).size).toBe(room.enemyCount);

    const locations = [{ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 800, y: 100 }];
    expect(chooseDistantSpawnIndices(locations, [0, 1, 2],
      { x: 0, y: 100 }, 1, 200, [{ x: 800, y: 100 }])).toEqual([1]);
  });
});

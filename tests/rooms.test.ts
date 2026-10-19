import { describe, expect, it } from 'vitest';

import { ARENA_BOUNDS } from '../src/config/gameplay';
import { getSlimeStatsForRoom } from '../src/enemies/enemyConfig';
import {
  BOSS_ROOM_INTERVAL,
  CHAPTER_ROOM_COUNT,
  ROOM_DIFFICULTY,
  ROOM_LAYOUTS,
  getEnemyCountForRoom,
  getRoomDefinition,
} from '../src/rooms/roomConfig';
import { RoomProgress } from '../src/rooms/RoomProgress';

describe('phase 4 room progression', () => {
  it('opens the door only after every planned enemy is defeated', () => {
    const progress = new RoomProgress(CHAPTER_ROOM_COUNT);
    progress.startRoom(3);

    expect(progress.doorOpen).toBe(false);
    expect(progress.registerEnemyDefeated()).toBe(false);
    expect(progress.registerEnemyDefeated()).toBe(false);
    expect(progress.registerEnemyDefeated()).toBe(true);
    expect(progress.advance()).toBe(2);
  });

  it('stops after room 50 is cleared', () => {
    const progress = new RoomProgress(CHAPTER_ROOM_COUNT);

    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room += 1) {
      progress.startRoom(1);
      progress.registerEnemyDefeated();
      if (room < CHAPTER_ROOM_COUNT) {
        expect(progress.advance()).toBe(room + 1);
      }
    }

    expect(progress.chapterComplete).toBe(true);
    expect(progress.advance()).toBeNull();
  });

  it('returns to room one when the scene restarts', () => {
    const progress = new RoomProgress(CHAPTER_ROOM_COUNT);
    progress.startRoom(1);
    progress.registerEnemyDefeated();
    progress.advance();
    progress.reset();

    expect(progress.roomNumber).toBe(1);
    expect(progress.doorOpen).toBe(false);
  });
});

describe('phase 4 room configuration', () => {
  it('reserves every fifth room as a future boss room', () => {
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room += 1) {
      expect(getRoomDefinition(room).isBossRoom).toBe(room % BOSS_ROOM_INTERVAL === 0);
    }
  });

  it('keeps every obstacle inside the arena', () => {
    for (const layout of ROOM_LAYOUTS) {
      for (const obstacle of layout.obstacles) {
        expect(obstacle.x - obstacle.width / 2).toBeGreaterThan(ARENA_BOUNDS.x);
        expect(obstacle.x + obstacle.width / 2).toBeLessThan(
          ARENA_BOUNDS.x + ARENA_BOUNDS.width,
        );
        expect(obstacle.y - obstacle.height / 2).toBeGreaterThan(ARENA_BOUNDS.y);
        expect(obstacle.y + obstacle.height / 2).toBeLessThan(
          ARENA_BOUNDS.y + ARENA_BOUNDS.height,
        );
      }
    }
  });

  it('never places a configured enemy spawn inside an obstacle', () => {
    for (const layout of ROOM_LAYOUTS) {
      for (const spawn of layout.enemySpawns) {
        for (const obstacle of layout.obstacles) {
          const outsideHorizontally =
            spawn.x < obstacle.x - obstacle.width / 2 - 20 ||
            spawn.x > obstacle.x + obstacle.width / 2 + 20;
          const outsideVertically =
            spawn.y < obstacle.y - obstacle.height / 2 - 20 ||
            spawn.y > obstacle.y + obstacle.height / 2 + 20;
          expect(outsideHorizontally || outsideVertically).toBe(true);
        }
      }
    }
  });

  it('scales enemy count, HP and damage with configured caps', () => {
    const roomOne = getSlimeStatsForRoom(1);
    const roomTwenty = getSlimeStatsForRoom(20);

    expect(roomTwenty.maxHp).toBeGreaterThan(roomOne.maxHp);
    expect(roomTwenty.damage).toBeGreaterThan(roomOne.damage);
    expect(getEnemyCountForRoom(20)).toBe(ROOM_DIFFICULTY.maxEnemyCount);
    expect(getEnemyCountForRoom(200)).toBe(ROOM_DIFFICULTY.maxEnemyCount);
  });
});

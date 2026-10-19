import { describe, expect, it } from 'vitest';
import {
  WORLD_COUNT, WORLDS, getWorld, getWorldBossName, isWorldUnlocked, toWorldId,
} from '../src/worlds/worldConfig';
import { CHAPTER_ROOM_COUNT, getRoomDefinition } from '../src/rooms/roomConfig';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { RunLedger } from '../src/progression/RunLedger';
import {
  SaveManager, applyProfileAction, defaultProfile, validateProfile,
} from '../src/progression/ProgressStore';

const completedRun = (worldId: 1 | 2 | 3 | 4 | 5, id: string, victory: boolean,
  room = 50) => {
  const run = new RunLedger(id, worldId);
  run.enterRoom(room);
  run.collectGold(37);
  return run.report(victory);
};

describe('five unique playable worlds', () => {
  it('has five worlds with distinct names, palettes and 10 bosses per world', () => {
    expect(WORLD_COUNT).toBe(5);
    expect(new Set(WORLDS.map(w => w.name)).size).toBe(5);
    expect(new Set(WORLDS.map(w => w.floor)).size).toBe(5);
    expect(new Set(WORLDS.map(w => w.accent)).size).toBe(5);
    const bossNames = new Set<string>();
    for (const world of WORLDS) {
      expect(world.bossNames).toHaveLength(10);
      for (let room = 5; room <= CHAPTER_ROOM_COUNT; room += 5) {
        expect(getRoomDefinition(room).isBossRoom).toBe(true);
        expect(getRoomDefinition(room).enemyCount).toBe(1);
        bossNames.add(getWorldBossName(world.id, room));
      }
    }
    expect(bossNames.size).toBe(50);
  });

  it('uses different floor patterns in the five maps without unsafe spawn positions', () => {
    const firstPatterns = WORLDS.map(world => getRoomDefinition(1, world.id).layout.id);
    expect(new Set(firstPatterns).size).toBe(5);
    for (const world of WORLDS) {
      const patterns = new Set<string>();
      for (let room = 1; room <= 50; room++) {
        const definition = getRoomDefinition(room, world.id);
        expect(definition.enemySpawns).toHaveLength(definition.enemyCount);
        if (!definition.isBossRoom) patterns.add(definition.layout.id);
        for (const point of definition.enemySpawns) {
          expect(point.x).toBeGreaterThan(definition.layout.bounds.x);
          expect(point.y).toBeGreaterThan(definition.layout.bounds.y);
        }
      }
      expect(patterns.size).toBe(21);
    }
  });

  it('progressively scales all enemy stats between worlds at the same room', () => {
    for (const kind of ['slime', 'archer', 'charger', 'mage', 'tank', 'bomber', 'boss'] as const) {
      for (let world = 2; world <= WORLD_COUNT; world++) {
        const oldStats = getEnemyStatsForRoom(kind, 24, (world - 1) as 1 | 2 | 3 | 4 | 5);
        const newStats = getEnemyStatsForRoom(kind, 24, world as 1 | 2 | 3 | 4 | 5);
        expect(newStats.maxHp).toBeGreaterThan(oldStats.maxHp);
        expect(newStats.damage).toBeGreaterThan(oldStats.damage);
        expect(newStats.movementSpeed).toBeGreaterThanOrEqual(oldStats.movementSpeed);
        expect(newStats.attackIntervalMs).toBeLessThanOrEqual(oldStats.attackIntervalMs);
      }
    }
    expect(getWorld(5).hpMultiplier).toBeGreaterThan(getWorld(1).hpMultiplier);
  });
});

describe('world unlocking and persistent selection', () => {
  it('starts world 1 open and every later world locked', () => {
    const start = defaultProfile();
    expect(start.selectedWorld).toBe(1);
    expect(start.completedWorlds).toBe(0);
    expect(start.worldBestRooms).toEqual([1, 1, 1, 1, 1]);
    for (const w of WORLDS) expect(isWorldUnlocked(w.id, start.completedWorlds)).toBe(w.id === 1);
    expect(applyProfileAction(start, { type: 'selectWorld', id: 2 })).toEqual(start);
  });

  it('does not unlock a world by reaching room 50 without clearing it', () => {
    const p = applyProfileAction(defaultProfile(), {
      type: 'settleRun', report: completedRun(1, 'failed-at-50', false),
    });
    expect(p.completedWorlds).toBe(0);
    expect(p.worldBestRooms[0]).toBe(50);
    expect(isWorldUnlocked(2, p.completedWorlds)).toBe(false);
  });

  it('opens exactly the next world after clearing room 50, then persists selection', () => {
    let p = defaultProfile();
    for (let world = 1; world <= WORLD_COUNT; world++) {
      const w = world as 1 | 2 | 3 | 4 | 5;
      expect(isWorldUnlocked(w, p.completedWorlds)).toBe(true);
      p = applyProfileAction(p, { type: 'settleRun',
        report: completedRun(w, 'win-world-' + w, true) });
      expect(p.completedWorlds).toBe(world);
      expect(p.worldBestRooms[w - 1]).toBe(50);
      expect(p.totalGoldEarned).toBe(37 * world);
      if (world < WORLD_COUNT) {
        const next = (world + 1) as 1 | 2 | 3 | 4 | 5;
        expect(isWorldUnlocked(next, p.completedWorlds)).toBe(true);
        p = applyProfileAction(p, { type: 'selectWorld', id: next });
        expect(p.selectedWorld).toBe(next);
      }
    }
    expect(p.gold).toBe(defaultProfile().gold + 37 * WORLD_COUNT);
  });

  it('deduplicates gold settlement and does not unlock using a skipped world', () => {
    let profile = defaultProfile();
    const report = completedRun(3, 'cannot-skip', true);
    profile = applyProfileAction(profile, { type: 'settleRun', report });
    expect(profile.completedWorlds).toBe(0);
    expect(profile.totalGoldEarned).toBe(37);
    expect(applyProfileAction(profile, { type: 'settleRun', report })).toEqual(profile);
  });

  it('migrates old saves without discarding gear, gold, or highest room', () => {
    const original = { ...defaultProfile(), gold: 945, highestRoom: 33,
      selectedHero: 'mage' as const, selectedWorld: undefined,
      worldBestRooms: undefined, completedWorlds: undefined, totalGoldEarned: undefined };
    const saved = validateProfile(original);
    expect(saved.gold).toBe(945);
    expect(saved.selectedHero).toBe('ranger'); // Locked heroes are still validated.
    expect(saved.highestRoom).toBe(33);
    expect(saved.worldBestRooms).toEqual([33, 1, 1, 1, 1]);
    expect(saved.selectedWorld).toBe(1);
    expect(saved.completedWorlds).toBe(0);
    expect(saved.totalGoldEarned).toBe(0);
    expect(toWorldId(999)).toBe(1);
  });

  it('persists world choice, victories, and lifetime money in browser storage', () => {
    const map = new Map<string, string>();
    const local = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value); },
      removeItem: (key: string) => { map.delete(key); },
    };
    const store = new SaveManager(local);
    expect(store.dispatch({ type: 'settleRun', report: completedRun(1, 'saved-world1', true) })).toBe(true);
    expect(store.dispatch({ type: 'selectWorld', id: 2 })).toBe(true);
    const loaded = new SaveManager(local).current;
    expect(loaded.completedWorlds).toBe(1);
    expect(loaded.selectedWorld).toBe(2);
    expect(loaded.totalGoldEarned).toBe(37);
  });
});

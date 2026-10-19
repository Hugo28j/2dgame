import { describe, expect, it } from 'vitest';

import {
  ENEMY_CONFIGS, getBossName, getEnemyKindForRoom, getEnemyStatsForRoom,
} from '../src/enemies/enemyConfig';
import { bossPhase, rangedVelocity, withinRadius } from '../src/enemies/enemyMovement';
import { shotAngles } from '../src/enemies/projectilePatterns';
import { CHAPTER_ROOM_COUNT, getRoomDefinition } from '../src/rooms/roomConfig';

describe('phase 7 room enemy rosters', () => {
  it('introduces all six ordinary types and the boss', () => {
    expect(getEnemyKindForRoom(1, 0)).toBe('slime');
    expect(getEnemyKindForRoom(2, 0)).toBe('archer');
    expect(getEnemyKindForRoom(3, 0)).toBe('charger');
    expect(getEnemyKindForRoom(4, 0)).toBe('tank');
    expect(getEnemyKindForRoom(6, 0)).toBe('mage');
    expect(getEnemyKindForRoom(7, 0)).toBe('bomber');
    const seen = new Set<string>();
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      const definition = getRoomDefinition(room);
      for (let i = 0; i < definition.enemyCount; i++) {
        seen.add(getEnemyKindForRoom(room, i));
      }
    }
    expect(seen).toEqual(new Set(['slime', 'archer', 'charger', 'mage', 'tank', 'bomber', 'boss']));
  });

  it('has one real boss per fifth room, away from the player spawn', () => {
    for (const room of [5, 10, 15, 20]) {
      const definition = getRoomDefinition(room);
      expect(definition.isBossRoom).toBe(true);
      expect(definition.enemyCount).toBe(1);
      expect(definition.enemySpawns).toHaveLength(1);
      expect(getEnemyKindForRoom(room, 0)).toBe('boss');
      const spawn = definition.enemySpawns[0]!;
      expect(Math.hypot(spawn.x - definition.layout.playerSpawn.x,
        spawn.y - definition.layout.playerSpawn.y)).toBeGreaterThan(120);
    }
    expect([5, 10, 15, 20].map(getBossName)).toEqual([
      'Stone Warden', 'Ember Colossus', 'Frost Tyrant', 'Void Sentinel',
    ]);
  });

  it('configures valid, scaling HP and damage for each enemy type', () => {
    for (const config of Object.values(ENEMY_CONFIGS)) {
      expect(config.maxHp).toBeGreaterThan(0);
      expect(config.damage).toBeGreaterThan(0);
      expect(config.attackIntervalMs).toBeGreaterThan(0);
      expect(config.movementSpeed).toBeGreaterThan(0);
      const early = getEnemyStatsForRoom(config.id, 1);
      const late = getEnemyStatsForRoom(config.id, 20);
      expect(late.maxHp).toBeGreaterThan(early.maxHp);
      expect(late.damage).toBeGreaterThan(early.damage);
    }
  });
});

describe('phase 7 tactical movement', () => {
  it('has normalized strafing movement and approaches distant targets', () => {
    const near = rangedVelocity(0, 0, 150, 0, 80, 160);
    const far = rangedVelocity(0, 0, 400, 0, 80, 160);
    expect(Math.hypot(near.x, near.y)).toBeCloseTo(80);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(80);
    expect(far.x).toBeGreaterThan(0);
  });
  it('backs away when the player is too close', () => {
    expect(rangedVelocity(0, 0, 25, 0, 80, 180).x).toBeLessThan(0);
  });
  it('switches the boss to phase two at half health', () => {
    expect(bossPhase(1)).toBe(1);
    expect(bossPhase(0.51)).toBe(1);
    expect(bossPhase(0.5)).toBe(2);
    expect(bossPhase(0.01)).toBe(2);
  });
  it('uses a circular explosion hit test with exact boundary handling', () => {
    expect(withinRadius(0, 0, 30, 40, 50)).toBe(true);
    expect(withinRadius(0, 0, 30, 41, 50)).toBe(false);
  });
});

describe('phase 7 projectile patterns', () => {
  it('fires equally spaced 360-degree radial shots instead of an aimed fan', () => {
    const angles = shotAngles('radial', 2);
    expect(angles).toHaveLength(8);
    angles.forEach((angle, index) => expect(angle).toBeCloseTo(index * Math.PI / 4));
    expect(shotAngles('fan', 0)).toEqual([-0.28, 0, 0.28]);
    expect(shotAngles('single', 0.5)).toEqual([0.5]);
  });
});

import { describe, expect, it } from 'vitest';
import { ENEMY_CONFIGS, ENEMY_UNLOCK_ROOMS,
  getEnemyKindForRoom, getEnemyStatsForRoom, type EnemyKind } from '../src/enemies/enemyConfig';
import { WORLD1_BRIAR_DAMAGE_MULTIPLIER,
  WORLD1_BRIAR_ARROW_SPEED_MULTIPLIER } from '../src/enemies/enemyBalance';
import { getWorldCharacter } from '../src/enemies/worldCharacters';
import { reflectArrow, ricochetAxis } from '../src/enemies/enemyRicochet';
import { TREANT_SHIELD_BREAK_RATIO,
  shouldBreakTreantShield, firstShieldOnPath } from '../src/enemies/treantShield';

const allKinds: EnemyKind[] = ['slime', 'archer', 'charger', 'mage', 'tank', 'bomber', 'boss'];

describe('fase 3 — defense in wereld 1 en 2', () => {
  it('doubles base defense exactly for every normal enemy and boss in both worlds', () => {
    for (const kind of allKinds) {
      for (const world of [1, 2] as const) {
        for (const room of [1, 4, 10, 17, 20, 30]) {
          expect(getEnemyStatsForRoom(kind, room, world).defense)
            .toBe(ENEMY_CONFIGS[kind].defense * 2);
        }
      }
    }
    expect(getEnemyStatsForRoom('slime', 1, 1).defense).toBe(12);
    expect(getEnemyStatsForRoom('archer', 7, 1).defense).toBe(4);
    expect(getEnemyStatsForRoom('charger', 11, 1).defense).toBe(16);
    expect(getEnemyStatsForRoom('tank', 16, 1).defense).toBe(36);
    expect(getEnemyStatsForRoom('mage', 21, 1).defense).toBe(8);
    expect(getEnemyStatsForRoom('bomber', 26, 1).defense).toBe(6);
    expect(getEnemyStatsForRoom('boss', 5, 1).defense).toBe(24);
  });
  it('preserves world 3, 4, and 5 defense values without double-buffing', () => {
    for (const world of [3, 4, 5] as const)
      for (const kind of allKinds)
        expect(getEnemyStatsForRoom(kind, 30, world).defense).toBe(ENEMY_CONFIGS[kind].defense);
  });
});

describe('fase 3 — Briar Hunter', () => {
  it('unlocks exactly from room 4 in world 1 (without changing Frozen Hollow)', () => {
    expect(ENEMY_UNLOCK_ROOMS.archer).toBe(4);
    for (const room of [1, 2, 3])
      for (let i = 0; i < 70; i++)
        expect(getEnemyKindForRoom(room, i, 1)).not.toBe('archer');
    expect(getEnemyKindForRoom(4, 0, 1)).toBe('archer');
    expect(getWorldCharacter(1, 'archer').name).toBe('Briar Hunter');
    for (const world of [4, 5] as const) {
      for (const room of [1, 2, 3, 4, 6])
        for (let i = 0; i < 24; i++)
          expect(getEnemyKindForRoom(room, i, world)).not.toBe('archer');
      expect(getEnemyKindForRoom(7, 0, world)).toBe('archer');
    }
    expect(getEnemyKindForRoom(3, 0, 3)).toBe('archer');
  });
  it('doubles CURRENT Briar damage and increases arrow speed 50%', () => {
    expect(WORLD1_BRIAR_DAMAGE_MULTIPLIER).toBe(3);
    expect(WORLD1_BRIAR_ARROW_SPEED_MULTIPLIER).toBe(1.5);
    for (const room of [1, 4, 11]) {
      const oldDamage = Math.round(12 * 1.5 * (1 + (room - 1) * 0.05));
      const newDamage = getEnemyStatsForRoom('archer', room, 1).damage;
      // Rounding occurs once at the end of the new 2x damage modifier.
      expect(newDamage).toBe(Math.round(12 * 3 * (1 + (room - 1) * 0.05)));
      expect(newDamage).toBeGreaterThan(oldDamage);
      expect(getEnemyStatsForRoom('archer', room, 2).damage).toBeGreaterThan(0);
    }
  });
  it('reflects off vertical and horizontal walls without losing speed', () => {
    const travel = { x: 384, y: -288 };
    expect(reflectArrow(travel, 'x')).toEqual({ x: -384, y: -288 });
    expect(reflectArrow(travel, 'y')).toEqual({ x: 384, y: 288 });
    expect(Math.hypot(...Object.values(reflectArrow(travel, 'x')))).toBe(480);
    expect(ricochetAxis({x: 10,y: 10},travel,{left:true})).toBe('x');
    expect(ricochetAxis({x: 10,y: 10},travel,{up:true})).toBe('y');
    expect(ricochetAxis({x: 99,y: 50},travel,{}, {x: 120,y: 50,width: 60,height: 80}))
      .toBe('x');
  });
});

describe('fase 3 — Ancient Treant shield', () => {
  it('breaks only strictly below 30% live health and never recovers', () => {
    expect(TREANT_SHIELD_BREAK_RATIO).toBe(0.3);
    expect(shouldBreakTreantShield(0.301, false)).toBe(false);
    expect(shouldBreakTreantShield(0.3, false)).toBe(false);
    expect(shouldBreakTreantShield(0.299999, false)).toBe(true);
    expect(shouldBreakTreantShield(0.25, true)).toBe(false);
    expect(shouldBreakTreantShield(0.7, true)).toBe(false);
    expect(shouldBreakTreantShield(0, false)).toBe(false);
  });
  it('removes shielding geometry from intercepted shots and blast pressure', () => {
    const treant = {x: 100,y: 100,facingX:-1,facingY:0};
    const origin = {x:-60,y:100}, protectedMonster = {x:170,y:100};
    expect(firstShieldOnPath(origin, protectedMonster,[treant])).toBe(treant);
    expect(firstShieldOnPath(origin, protectedMonster,[])).toBeUndefined();
  });
});

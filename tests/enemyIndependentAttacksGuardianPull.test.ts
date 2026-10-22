import { describe, expect, it } from 'vitest';
import { initialEnemyShotDelay, delayEnemyAttackForStun } from '../src/enemies/enemyAttackTiming';
import { inForwardRectangle } from '../src/abilities/directedGeometry';
import {
  guardianPullStunMs, guardianPullSpeed,
  GUARDIAN_PULL_HALF_WIDTH, GUARDIAN_PULL_DURATION_MS,
} from '../src/abilities/guardianPull';
import { ABILITIES, getAbilityStats, MAX_ABILITY_LEVEL } from '../src/abilities/abilityConfig';

describe('independent enemy shooting', () => {
  it('stagger-spawns identical ranged mobs instead of synchronizing their shots', () => {
    const ids = Array.from({ length: 16 }, (_, i) => 'room-4-archer-' + i);
    const deadlines = ids.map(id => initialEnemyShotDelay(id, 1500));
    expect(new Set(deadlines).size).toBeGreaterThan(11);
    expect(Math.min(...deadlines)).toBeGreaterThanOrEqual(975);
    expect(Math.max(...deadlines)).toBeLessThanOrEqual(2025);
    expect(initialEnemyShotDelay(ids[3]!, 1500)).toBe(deadlines[3]);
    expect(initialEnemyShotDelay(ids[3]!, 1950)).not.toBe(deadlines[3]);
  });

  it('stunning one shooter shifts only its own firing deadline', () => {
    const now = 5000, a = 5200, b = 5360;
    const stunnedA = delayEnemyAttackForStun(a, now, 0, now + 800);
    expect(stunnedA).toBe(6000);
    expect(b).toBe(5360); // no shared clock
    expect(delayEnemyAttackForStun(stunnedA, 5400, 5800, 5800)).toBe(stunnedA);
    expect(delayEnemyAttackForStun(stunnedA, 5500, 5800, 6100)).toBe(6300);
    // A past-due attack is not released as a burst after the stun.
    expect(delayEnemyAttackForStun(4000, now, 0, now + 800)).toBe(5800);
  });
});

describe('Guardian ability 2 directed gravity bar', () => {
  const dir = {x:1,y:0};
  it('hits only inside the forward rectangular corridor', () => {
    const range = getAbilityStats('guardian-slam', 1).radius;
    expect(inForwardRectangle(0,0,dir,100,0,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(true);
    expect(inForwardRectangle(0,0,dir,225,55,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(true);
    expect(inForwardRectangle(0,0,dir,150,57,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(false);
    expect(inForwardRectangle(0,0,dir,-10,0,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(false);
    expect(inForwardRectangle(0,0,dir,range+1,0,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(false);
    expect(inForwardRectangle(0,0,{x:0,y:1},0,110,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(true);
    expect(inForwardRectangle(0,0,{x:0,y:1},110,0,range,GUARDIAN_PULL_HALF_WIDTH)).toBe(false);
  });

  it('stuns 0.8 seconds at first level and 1.4 at maximum, scaling across levels', () => {
    expect(guardianPullStunMs(1)).toBe(800);
    expect(guardianPullStunMs(MAX_ABILITY_LEVEL)).toBe(1400);
    expect(guardianPullStunMs(10)).toBeGreaterThan(800);
    expect(guardianPullStunMs(10)).toBeLessThan(1400);
    expect(guardianPullStunMs(0)).toBe(800);
    expect(guardianPullStunMs(100)).toBe(1400);
    expect(ABILITIES['guardian-slam'].kind).toBe('wind');
    expect(ABILITIES['guardian-slam'].slot).toBe(2);
  });

  it('pull speed slows before the player rather than throwing enemies behind them', () => {
    expect(guardianPullSpeed(25)).toBe(0);
    expect(guardianPullSpeed(80)).toBeGreaterThan(0);
    expect(guardianPullSpeed(225)).toBeLessThanOrEqual(710);
    expect(guardianPullSpeed(225) * GUARDIAN_PULL_DURATION_MS / 1000)
      .toBeLessThanOrEqual(225-37);
  });
});

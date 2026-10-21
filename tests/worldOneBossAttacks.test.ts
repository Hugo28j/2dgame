import { describe, expect, it } from 'vitest';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { MOSS_DASH, ROOT_BRANCH, SPORE_THROW_INTERVAL_MS,
  rootBurstAngles } from '../src/enemies/worldOneBossBalance';
import { SPORE_POISON } from '../src/enemies/poisonHazard';

describe('world one boss attacks', () => {
  it('makes both dash phases travel 50% farther with short telegraph', () => {
    expect(MOSS_DASH.warningMs).toBe(165);
    expect(MOSS_DASH.phaseOneSpeed).toBe(720);
    expect(MOSS_DASH.phaseTwoSpeed).toBe(1080);
    expect(MOSS_DASH.phaseOneSpeed * MOSS_DASH.phaseOneDurationMs / 1000)
      .toBeCloseTo(360 * 1080 / 1000 * 1.5);
    expect(MOSS_DASH.phaseTwoSpeed * MOSS_DASH.phaseTwoDurationMs / 1000)
      .toBeCloseTo(360 * 1080 / 1000 * 1.5);
    expect(MOSS_DASH.phaseTwoRechargeMs).toBeLessThan(MOSS_DASH.phaseOneRechargeMs);
  });
  it('fires three rotated eight-way root bursts with 0.8s gaps and a 3s rest', () => {
    const first = rootBurstAngles(0), second = rootBurstAngles(1), third = rootBurstAngles(2);
    expect(first).toHaveLength(8);
    expect(second).toHaveLength(8);
    expect(third).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(second[i]! - first[i]!).toBeCloseTo(Math.PI / 8);
      expect(third[i]! - second[i]!).toBeCloseTo(Math.PI / 8);
    }
    expect(ROOT_BRANCH.burstStaggerMs).toBe(800);
    expect(ROOT_BRANCH.pauseAfterBurstMs).toBe(3000);
    expect(ROOT_BRANCH.lineRecoveryMs).toBe(3000);
  });
  it('shortens poison and speeds up its casts', () => {
    expect(SPORE_POISON.durationMs).toBe(1500);
    expect(SPORE_THROW_INTERVAL_MS).toBe(1000);
  });
  it('adds 50% to Spore original 1.5× HP at level 15 and retains final-boss HP', () => {
    for (const [room, multiplier] of [[15, 2.25], [30, 2]] as const) {
      const stats = getEnemyStatsForRoom('boss', room, 1);
      const scaling = 1 + (room - 1) * .08;
      const tier = 1 + (Math.floor(room / 5) - 1) * .09;
      expect(stats.maxHp).toBe(Math.round(880 * scaling * tier * multiplier));
      expect(getEnemyStatsForRoom('boss', room, 2).maxHp).toBeGreaterThan(0);
    }
  });
});

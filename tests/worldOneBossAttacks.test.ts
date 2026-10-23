import { describe, expect, it } from 'vitest';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { MOSS_DASH, ROOT_BRANCH,
  SPORE_THROW_INTERVAL_MS } from '../src/enemies/worldOneBossBalance';
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
  it('uses three fast giant-arm strikes, then a predicted explosive leaf and a 3s rest', () => {
    expect(ROOT_BRANCH.strikeStaggerMs).toBe(650);
    expect(ROOT_BRANCH.strikeWarningMs).toBeLessThan(ROOT_BRANCH.lineWarningMs);
    expect(ROOT_BRANCH.leafDelayMs).toBeGreaterThan(ROOT_BRANCH.strikeStaggerMs);
    expect(ROOT_BRANCH.leafPredictionMs).toBe(900);
    expect(ROOT_BRANCH.leafExplosionRadius).toBe(68);
    expect(ROOT_BRANCH.pauseAfterBurstMs).toBe(3000);
    expect(ROOT_BRANCH.lineRecoveryMs).toBe(3000);
  });
  it('shortens poison and speeds up its casts', () => {
    expect(SPORE_POISON.durationMs).toBe(1500);
    expect(SPORE_THROW_INTERVAL_MS).toBe(1000);
  });
  it('retains the earlier 50% Spore increase, applies the new 15% reduction and preserves final-boss HP', () => {
    for (const [room, multiplier] of [[15, 2.25 * .85], [30, 2]] as const) {
      const stats = getEnemyStatsForRoom('boss', room, 1);
      const scaling = 1 + (room - 1) * .08;
      const tier = 1 + (Math.floor(room / 5) - 1) * .09;
      expect(stats.maxHp).toBe(Math.round(880 * scaling * tier * multiplier));
      expect(getEnemyStatsForRoom('boss', room, 2).maxHp).toBeGreaterThan(0);
    }
  });
});

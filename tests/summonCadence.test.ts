import { describe, expect, it } from 'vitest';
import { FROZEN_EARLY } from '../src/enemies/frozenEarlyGame';
import { FROZEN_BALANCE } from '../src/enemies/frozenBalance';
import { shouldSplitFrozenGiant } from '../src/enemies/frozenSplit';
import { getEnemyKindForRoom } from '../src/enemies/enemyConfig';
import { glacierBossSlot } from '../src/enemies/frozenBalance';
import { FIRST_SUMMON_DELAY_MS, firstSummonTime, getSummonerType,
  nextSummonTime, summonIntervalMs, summonIsDue } from '../src/enemies/summonCadence';

describe('First summon immediately, then the full original cooldown', () => {
  it('identifies all living enemy and boss summoners, not death-triggered splitting', () => {
    expect(getEnemyKindForRoom(3, 0, 2)).toBe('mage');
    expect(getSummonerType(2, 'mage', 3, 0)).toBe('frost-witch');
    expect(getSummonerType(2, 'mage', 19, 0)).toBe('frost-witch');
    expect(glacierBossSlot(15)).toBe(1);
    expect(getSummonerType(2, 'boss', 15, glacierBossSlot(15))).toBe('snow-sentinel');
    for (const [world,kind,room,slot] of [
      [1, 'mage', 21, 0],
      [1, 'boss', 20, 0], // Bramble Gunner splits on defeat
      [1, 'boss', 20, 1], // Bloom Sentinels come from the split
      [2, 'tank', 16, 0], // normal Glacier Giant splits on defeat
      [2, 'tank', 15, 0], // Snow Sentinel summoned Golem: no death split
      [2, 'boss', 15, 0], // not the Snow Sentinel slot
      [2, 'boss', 20, 0],
      [3, 'mage', 18, 0],
      [4, 'boss', 15, 0],
      [5, 'mage', 25, 0],
    ] as const) {
      expect(getSummonerType(world,kind,room,slot)).toBeUndefined();
    }
    expect(shouldSplitFrozenGiant(2,'tank','tank-10')).toBe(true);
    expect(shouldSplitFrozenGiant(2,'tank','sentinel-golem-10')).toBe(false);
  });

  it.each(['frost-witch','snow-sentinel'] as const)(
    '%s produces first summons in under one second, then has no early duplicate', type => {
      const createdAt = 4200;
      const first = firstSummonTime(createdAt,type);
      expect(FIRST_SUMMON_DELAY_MS).toBeGreaterThan(0);
      expect(FIRST_SUMMON_DELAY_MS).toBeLessThan(1000);
      expect(first).toBe(createdAt+350);
      expect(summonIsDue(first-1,first)).toBe(false);
      expect(summonIsDue(first,first)).toBe(true);
      const next = nextSummonTime(first,type);
      expect(next).toBe(first+summonIntervalMs(type));
      expect(summonIsDue(first+1000,next)).toBe(false);
      expect(summonIsDue(next-1,next)).toBe(false);
      expect(summonIsDue(next,next)).toBe(true);
      expect(summonIsDue(next+20,next)).toBe(true);
    }
  );

  it('keeps the Frost Witch at five seconds and Snow Sentinel at twenty seconds', () => {
    expect(summonIntervalMs('frost-witch')).toBe(5000);
    expect(summonIntervalMs('snow-sentinel')).toBe(20000);
    expect(summonIntervalMs('frost-witch')).toBe(FROZEN_EARLY.witchSummonIntervalMs);
    expect(summonIntervalMs('snow-sentinel')).toBe(FROZEN_BALANCE.sentinelSummonIntervalMs);
    // The repeat cooldown is measured from the FIRST summon, not appearance.
    expect(nextSummonTime(350,'frost-witch')).toBe(5350);
    expect(nextSummonTime(350,'snow-sentinel')).toBe(20350);
  });

  it('applies only to actual summoners and does not schedule a corpse split', () => {
    expect(firstSummonTime(1000,undefined)).toBe(Infinity);
    expect(summonIsDue(1_000_000,Infinity)).toBe(false);
    expect(summonIsDue(NaN,350)).toBe(false);
    expect(firstSummonTime(1090,'frost-witch')).toBe(1440);
  });
});

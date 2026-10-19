import { describe, expect, it } from 'vitest';
import { COIN_VALUES, COIN_MAGNET_RADIUS, COIN_PICKUP_RADIUS,
  coinDropsForEnemy, advanceCoinTowardPlayer } from '../src/progression/coinRewards';
import { RunLedger } from '../src/progression/RunLedger';
import { defaultProfile, applyProfileAction } from '../src/progression/ProgressStore';
import { CHAPTER_ROOM_COUNT } from '../src/rooms/roomConfig';

describe('collectible enemy coin rewards', () => {
  it('drops at least one coin for every defeated enemy kind, including bosses', () => {
    for (const [kind, value] of Object.entries(COIN_VALUES)) {
      const drops = coinDropsForEnemy(kind as keyof typeof COIN_VALUES);
      expect(drops.length).toBeGreaterThan(0);
      expect(drops.every(amount => Number.isSafeInteger(amount) && amount > 0)).toBe(true);
      expect(drops.reduce((a, b) => a + b, 0)).toBe(value);
    }
    expect(coinDropsForEnemy('boss')).toHaveLength(5);
    expect(COIN_VALUES.slime).toBeLessThan(5);
    expect(COIN_VALUES.tank).toBeLessThan(9);
    expect(COIN_VALUES.boss).toBeLessThan(90);
  });

  it('gives NO gold on enemy kills or clearing rooms, including bosses', () => {
    const ledger = new RunLedger('pickup-required');
    ledger.enterRoom(5);
    expect(ledger.defeatEnemy('slime-a', 'slime')).toBe(true);
    expect(ledger.defeatEnemy('boss-b', 'boss')).toBe(true);
    expect(ledger.defeatEnemy('boss-b', 'boss')).toBe(false);
    expect(ledger.clearRoom(5)).toBe(true);
    expect(ledger.clearRoom(5)).toBe(false);
    expect(ledger.runGold).toBe(0);
    expect(ledger.report(true).earnedGold).toBe(0);
  });

  it('only counts picked-up coins, not all dropped coins, at final settlement', () => {
    const ledger = new RunLedger('only-picked-up');
    ledger.defeatEnemy('one', 'slime');
    ledger.defeatEnemy('two', 'boss');
    const allDrops = [...coinDropsForEnemy('slime'), ...coinDropsForEnemy('boss')];
    expect(allDrops.reduce((a, b) => a + b, 0)).toBe(27);
    ledger.collectGold(allDrops[0]!);
    ledger.collectGold(allDrops[1]!);
    expect(ledger.runGold).toBe(7);
    const profile = defaultProfile();
    const once = applyProfileAction(profile, { type: 'settleRun', report: ledger.report(false) });
    expect(once.gold).toBe(profile.gold + 7);
    expect(applyProfileAction(once, { type: 'settleRun', report: ledger.report(false) })).toEqual(once);
  });

  it('refuses zero, negatives and malformed pickups, and caps gold safely', () => {
    const ledger = new RunLedger('sane-coins');
    expect(ledger.collectGold(0)).toBe(false);
    expect(ledger.collectGold(-1)).toBe(false);
    expect(ledger.collectGold(1.5)).toBe(false);
    expect(ledger.collectGold(Infinity)).toBe(false);
    expect(ledger.runGold).toBe(0);
    expect(ledger.collectGold(1_000_000_000)).toBe(true);
    expect(ledger.collectGold(1)).toBe(true);
    expect(ledger.runGold).toBe(1_000_000_000);
    expect(CHAPTER_ROOM_COUNT).toBe(50);
  });
});

describe('coin magnet movement', () => {
  it('does not collect coins at long range: player must move toward the drop', () => {
    const coin = { x: 0, y: 0 }, player = { x: COIN_MAGNET_RADIUS + 50, y: 0 };
    const next = advanceCoinTowardPlayer(coin, player, 16);
    expect(next).toEqual({ ...coin, collected: false });
  });

  it('attracts nearby coins smoothly toward the player, faster as distance falls', () => {
    const player = { x: 0, y: 0 };
    const far = advanceCoinTowardPlayer({ x: 160, y: 0 }, player, 100);
    const close = advanceCoinTowardPlayer({ x: 55, y: 0 }, player, 100);
    expect(far.x).toBeLessThan(160);
    expect(far.x).toBeGreaterThan(0);
    expect(close.x).toBeLessThan(55);
    expect(55 - close.x).toBeGreaterThan(160 - far.x);
    expect(far.collected).toBe(false);
  });

  it('picks up at touch range and after magnetic movement without overshooting', () => {
    const player = { x: 100, y: 100 };
    expect(advanceCoinTowardPlayer(
      { x: player.x + COIN_PICKUP_RADIUS - 1, y: player.y }, player, 16,
    ).collected).toBe(true);
    let coin = { x: 230, y: 100 };
    let picked = false;
    for (let i = 0; i < 120 && !picked; i++) {
      const result = advanceCoinTowardPlayer(coin, player, 16);
      coin = { x: result.x, y: result.y };
      picked = result.collected;
    }
    expect(picked).toBe(true);
    expect(coin.x).toBeGreaterThanOrEqual(player.x);
  });

  it('does not move when paused or with invalid frame delta', () => {
    const coin = { x: 50, y: 50 }, player = { x: 120, y: 50 };
    expect(advanceCoinTowardPlayer(coin, player, 0)).toEqual({ ...coin, collected: false });
    expect(advanceCoinTowardPlayer(coin, player, NaN)).toEqual({ ...coin, collected: false });
  });
});

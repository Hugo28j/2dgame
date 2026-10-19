import type { EnemyKind } from '../enemies/enemyConfig';

/** Coins dropped per defeated enemy. No automatic gold from kills or rooms.
 * Deliberately far below the previous +5/+9/+90 per kill plus room bonuses.
 * Even the strongest enemy gives only 25 gold if all its coins are collected.
 */
export const COIN_VALUES: Readonly<Record<EnemyKind, number>> = Object.freeze({
  slime: 2,
  archer: 2,
  charger: 3,
  tank: 4,
  mage: 3,
  bomber: 3,
  boss: 25,
});

export function coinDropsForEnemy(kind: EnemyKind): readonly number[] {
  if (kind === 'boss') return [5, 5, 5, 5, 5];
  return [COIN_VALUES[kind]];
}

export const COIN_MAGNET_RADIUS = 180;
export const COIN_PICKUP_RADIUS = 23;

export interface CoinPosition { x: number; y: number }

/** Frame-rate-independent attraction; cannot pick up a distant coin without
 * approaching it. Coin movement is visual only (no expensive Arcade bodies). */
export function advanceCoinTowardPlayer(
  coin: Readonly<CoinPosition>, player: Readonly<CoinPosition>, deltaMs: number,
): { x: number; y: number; collected: boolean } {
  const dx = player.x - coin.x;
  const dy = player.y - coin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= COIN_PICKUP_RADIUS) return { ...coin, collected: true };
  if (distance > COIN_MAGNET_RADIUS || !Number.isFinite(deltaMs) || deltaMs <= 0) {
    return { ...coin, collected: false };
  }
  const proximity = 1 - distance / COIN_MAGNET_RADIUS;
  const speed = 235 + 460 * proximity;
  const step = Math.min(distance, speed * Math.min(deltaMs, 50) / 1000);
  const x = coin.x + dx / distance * step;
  const y = coin.y + dy / distance * step;
  return {
    x, y,
    collected: Math.hypot(player.x - x, player.y - y) <= COIN_PICKUP_RADIUS,
  };
}

import type { EnemyKind } from '../enemies/enemyConfig';
import type { WorldId } from '../worlds/worldConfig';

/** XP crystals are separate from gold and earned only when picked up. */
const BASE_XP: Readonly<Record<EnemyKind, number>> = {
  slime: 6, archer: 7, charger: 9, tank: 12, mage: 9, bomber: 9, boss: 90,
};
export function xpDropsForEnemy(kind: EnemyKind, worldId: WorldId = 1,
  roomNumber = 1): readonly number[] {
  const amount = Math.max(1, Math.round(BASE_XP[kind] *
    (1 + (worldId - 1) * 0.2 + Math.max(0, roomNumber - 1) * 0.015)));
  if (kind !== 'boss') return [amount];
  return Array.from({ length: 5 }, (_, i) =>
    Math.floor(amount / 5) + (i < amount % 5 ? 1 : 0));
}

import type { SpawnPoint } from '../enemies/EnemySpawner';

export interface SpawnWaveSettings {
  initial: number;
  batchSize: number;
  intervalMs: number;
  maxActive: number;
  preferredDistance: number;
}

/** Keep the first ten rooms familiar; late rooms spawn larger groups in waves
 * instead of creating 30+ moving sprites and bullets in the same frame. */
export function spawnWaveSettings(room: number, enemyCount: number): SpawnWaveSettings {
  const depth = Math.max(1, Math.floor(room));
  if (depth <= 10) return {
    initial: enemyCount, batchSize: enemyCount, intervalMs: 0,
    maxActive: enemyCount, preferredDistance: 140,
  };
  const tier = Math.floor((depth - 1) / 10);
  return {
    initial: Math.min(enemyCount, 7 + tier),
    batchSize: Math.min(8, 4 + tier),
    intervalMs: Math.max(1500, 2400 - tier * 190),
    maxActive: 12 + tier * 2,
    preferredDistance: Math.min(390, 205 + tier * 50),
  };
}

/** Choose points in distant, separated areas relative to the player's CURRENT
 * location, not the original starting tile. Remaining indices are consumed only
 * after the actual enemies are spawned. Works with no browser/Phaser APIs. */
export function chooseDistantSpawnIndices(
  points: readonly SpawnPoint[],
  remaining: readonly number[],
  player: Readonly<SpawnPoint>,
  count: number,
  preferredDistance: number,
  occupied: readonly SpawnPoint[] = [],
): number[] {
  const available = remaining.filter(index => {
    const p = points[index];
    return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
      occupied.every(o => Math.hypot(p.x - o.x, p.y - o.y) >= 60);
  });
  const chosen: number[] = [];
  while (chosen.length < count && available.length > 0) {
    let winner = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < available.length; i++) {
      const point = points[available[i]!]!;
      const distance = Math.hypot(point.x - player.x, point.y - player.y);
      const separation = chosen.length
        ? Math.min(...chosen.map(index => Math.hypot(
            point.x - points[index]!.x, point.y - points[index]!.y)))
        : Infinity;
      const occupiedGap = occupied.length
        ? Math.min(...occupied.map(o => Math.hypot(point.x - o.x, point.y - o.y)))
        : Infinity;
      const score = distance * 0.8 +
        Math.min(separation, 350) * 0.75 +
        Math.min(occupiedGap, 200) * 0.12 +
        (distance >= preferredDistance ? 300 : -500);
      if (score > bestScore) { bestScore = score; winner = i; }
    }
    if (winner < 0) break;
    chosen.push(available.splice(winner, 1)[0]!);
  }
  return chosen;
}

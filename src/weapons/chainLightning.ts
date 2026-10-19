export interface ChainTarget { enemyId: string; x: number; y: number; }
export function findChainTargets(
  initial: Readonly<ChainTarget>,
  candidates: readonly ChainTarget[],
  maxJumps = 2,
  maxDistance = 150,
): ChainTarget[] {
  const visited = new Set([initial.enemyId]);
  const result: ChainTarget[] = [];
  let last = initial;
  for (let i = 0; i < maxJumps; i += 1) {
    const nearest = candidates
      .filter(enemy => !visited.has(enemy.enemyId))
      .map(enemy => ({ enemy, distance: Math.hypot(enemy.x - last.x, enemy.y - last.y) }))
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest) break;
    result.push(nearest.enemy);
    visited.add(nearest.enemy.enemyId);
    last = nearest.enemy;
  }
  return result;
}

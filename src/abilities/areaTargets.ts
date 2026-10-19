export interface Point { readonly x: number; readonly y: number; }

/** Shared pure range check for instant AoE abilities; includes enemies on the edge. */
export function targetsInRadius<T extends Point>(
  x: number, y: number, radius: number, candidates: readonly T[],
): T[] {
  const radiusSquared = radius * radius;
  return candidates.filter(p => (p.x - x) ** 2 + (p.y - y) ** 2 <= radiusSquared);
}

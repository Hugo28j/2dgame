import type { Vector2Value } from '../input/vectorMath';

interface Bounds { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
interface Obstacle { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
interface Point { readonly x: number; readonly y: number }

/** Find the furthest safe teleport landing, never inside walls or outside the arena.
 * Obstacles may be crossed instantaneously, but may not be landed inside.
 */
export function findTeleportDestination(
  origin: Point, direction: Readonly<Vector2Value>, maxRange: number,
  bounds: Bounds, obstacles: readonly Obstacle[], padding = 20,
): Point {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (!(magnitude > 0.001) || !Number.isFinite(maxRange) || maxRange <= 0) return origin;
  const dx = direction.x / magnitude, dy = direction.y / magnitude;
  const farthest = Math.min(maxRange, Math.max(0, (bounds.width + bounds.height)));
  for (let distance = farthest; distance >= 12; distance -= 8) {
    const x = origin.x + dx * distance;
    const y = origin.y + dy * distance;
    if (x < bounds.x + padding || x > bounds.x + bounds.width - padding ||
      y < bounds.y + padding || y > bounds.y + bounds.height - padding) continue;
    if (obstacles.some(o => Math.abs(o.x - x) < o.width / 2 + padding &&
      Math.abs(o.y - y) < o.height / 2 + padding)) continue;
    return { x, y };
  }
  return origin;
}

/** A bomb must travel far enough that its explosion cannot touch the thrower. */
export function safeBombBlastDistance(radius: number): number {
  return Math.max(0, radius) + 45;
}

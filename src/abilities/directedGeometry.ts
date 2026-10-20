import type { Vector2Value } from '../input/vectorMath';

export function normalizedDirection(direction: Readonly<Vector2Value>): Vector2Value {
  const size = Math.hypot(direction.x, direction.y);
  return size > 0.001 ? { x: direction.x / size, y: direction.y / size } : { x: 1, y: 0 };
}

/** A forward rectangle, not a circular AOE. The start edge passes through the caster. */
export function inForwardRectangle(
  x: number, y: number, direction: Readonly<Vector2Value>,
  targetX: number, targetY: number, length: number, halfWidth: number,
): boolean {
  const dir = normalizedDirection(direction);
  const dx = targetX - x;
  const dy = targetY - y;
  const forward = dx * dir.x + dy * dir.y;
  const sideways = dx * -dir.y + dy * dir.x;
  return forward >= 0 && forward <= length && Math.abs(sideways) <= halfWidth;
}

/** Check if a target's radius overlaps a pellet ray inside its maximum range. */
export function rayHitsCircle(
  x: number, y: number, direction: Readonly<Vector2Value>,
  targetX: number, targetY: number, radius: number, range: number,
): boolean {
  const dir = normalizedDirection(direction);
  const dx = targetX - x;
  const dy = targetY - y;
  const distance = dx * dir.x + dy * dir.y;
  const sideways = Math.abs(dx * -dir.y + dy * dir.x);
  return distance >= 0 && distance <= range && sideways <= radius;
}

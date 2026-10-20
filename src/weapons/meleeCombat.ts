import type { Vector2Value } from '../input/vectorMath';

export interface MeleePoint { x: number; y: number }

/** Distance + facing-cone check used by all melee weapons. */
export function isInsideMeleeSwing(
  origin: Readonly<MeleePoint>, direction: Readonly<Vector2Value>,
  target: Readonly<MeleePoint>, range: number, arc: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  if (Math.hypot(dx, dy) > range) return false;
  if (dx === 0 && dy === 0) return true;
  const aimAngle = Math.atan2(direction.y, direction.x);
  const targetAngle = Math.atan2(dy, dx);
  const difference = Math.atan2(Math.sin(targetAngle - aimAngle), Math.cos(targetAngle - aimAngle));
  return Math.abs(difference) <= arc / 2;
}

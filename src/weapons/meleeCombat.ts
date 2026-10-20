import type { Vector2Value } from '../input/vectorMath';

export interface MeleePoint { x: number; y: number }

/** Check whether the swing sector touches a target's collision circle.
 * A radius of zero preserves the original center-point check for other weapons.
 */
export function isInsideMeleeSwing(
  origin: Readonly<MeleePoint>, direction: Readonly<Vector2Value>,
  target: Readonly<MeleePoint>, range: number, arc: number, targetRadius = 0,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  const radius = Math.max(0, targetRadius);
  if (distance > range + radius) return false;
  if (distance <= radius) return true;
  const aimAngle = Math.atan2(direction.y, direction.x);
  const targetAngle = Math.atan2(dy, dx);
  const difference = Math.atan2(Math.sin(targetAngle - aimAngle), Math.cos(targetAngle - aimAngle));
  // A slash grazing the edge of a mob counts: its center need not be inside.
  const angularPadding = Math.asin(Math.min(1, radius / distance));
  return Math.abs(difference) <= arc / 2 + angularPadding;
}

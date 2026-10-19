import type { Vector2Value } from '../input/vectorMath';
import { normalizeVector } from '../input/vectorMath';

export function rangedVelocity(
  x: number, y: number, targetX: number, targetY: number,
  speed: number, preferredDistance: number, orbitSign: -1 | 1 = 1,
): Vector2Value {
  const dx = targetX - x, dy = targetY - y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001) return { x: speed * orbitSign, y: 0 };
  const radial = normalizeVector(dx, dy);
  // Move away when cornered, approach outside range, strafe at preferred distance.
  const forward = distance > preferredDistance + 40 ? 0.8 :
    distance < preferredDistance - 40 ? -0.9 : 0;
  const sideways = forward === 0 ? 0.75 : 0.3;
  const result = normalizeVector(
    radial.x * forward - radial.y * sideways * orbitSign,
    radial.y * forward + radial.x * sideways * orbitSign,
  );
  return { x: result.x * speed, y: result.y * speed };
}
export function withinRadius(ax: number, ay: number, bx: number, by: number, radius: number): boolean {
  return (ax - bx) ** 2 + (ay - by) ** 2 <= radius * radius;
}
export function bossPhase(healthRatio: number): 1 | 2 {
  return healthRatio <= 0.5 ? 2 : 1;
}

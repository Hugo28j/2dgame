/** Geometry shared by the Treant shield render, projectile collision and
 * explosion cover tests. A shield is a wide plank facing the player.
 * There is NO extra shield HP: intercepted damage reduces the tank's HP.
 */
export interface ShieldPoint { x: number; y: number }
export interface ShieldSurface extends ShieldPoint {
  facingX: number;
  facingY: number;
}
export const TREANT_SHIELD = Object.freeze({
  offset: 31,
  halfWidth: 48,
  maxCoverDistance: 355,
  coverBehind: 82,
  coverSideOffset: 18,
});

/** Normal points from the tank toward the hero. */
export function shieldEndpoints(shield: Readonly<ShieldSurface>): readonly [ShieldPoint, ShieldPoint] {
  const length = Math.hypot(shield.facingX, shield.facingY) || 1;
  const nx = shield.facingX / length, ny = shield.facingY / length;
  const cx = shield.x + nx * TREANT_SHIELD.offset;
  const cy = shield.y + ny * TREANT_SHIELD.offset;
  return [
    { x: cx - ny * TREANT_SHIELD.halfWidth, y: cy + nx * TREANT_SHIELD.halfWidth },
    { x: cx + ny * TREANT_SHIELD.halfWidth, y: cy - nx * TREANT_SHIELD.halfWidth },
  ];
}

/** Returns first fraction along attack path that enters the *front* of shield.
 * Attacks from behind and from the sides are not blocked.
 */
export function shieldInterceptFraction(
  origin: Readonly<ShieldPoint>, end: Readonly<ShieldPoint>,
  shield: Readonly<ShieldSurface>,
): number | undefined {
  const length = Math.hypot(shield.facingX, shield.facingY) || 1;
  const nx = shield.facingX / length, ny = shield.facingY / length;
  const cx = shield.x + nx * TREANT_SHIELD.offset;
  const cy = shield.y + ny * TREANT_SHIELD.offset;
  const startNormal = (origin.x - cx) * nx + (origin.y - cy) * ny;
  const endNormal = (end.x - cx) * nx + (end.y - cy) * ny;
  if (startNormal <= 0 || endNormal >= 0) return undefined;
  const t = startNormal / (startNormal - endNormal);
  if (t < 0 || t > 1) return undefined;
  const px = origin.x + (end.x - origin.x) * t - cx;
  const py = origin.y + (end.y - origin.y) * t - cy;
  const sideways = -px * ny + py * nx;
  return Math.abs(sideways) <= TREANT_SHIELD.halfWidth ? t : undefined;
}

/** True only when a living shield stands between the damage source and target. */
export function firstShieldOnPath<T extends ShieldSurface>(
  origin: Readonly<ShieldPoint>, target: Readonly<ShieldPoint>,
  candidates: readonly T[],
): T | undefined {
  let best: T | undefined;
  let earliest = Number.POSITIVE_INFINITY;
  for (const shield of candidates) {
    const fraction = shieldInterceptFraction(origin, target, shield);
    if (fraction !== undefined && fraction < earliest) {
      earliest = fraction;
      best = shield;
    }
  }
  return best;
}

/** Ranged mobs seek the space behind the shield (opposite the player). */
export function rangedCoverSpot(
  shield: Readonly<ShieldSurface>, sideSign: number,
): ShieldPoint {
  const length = Math.hypot(shield.facingX, shield.facingY) || 1;
  const nx = shield.facingX / length, ny = shield.facingY / length;
  return {
    x: shield.x - nx * TREANT_SHIELD.coverBehind - ny * sideSign * TREANT_SHIELD.coverSideOffset,
    y: shield.y - ny * TREANT_SHIELD.coverBehind + nx * sideSign * TREANT_SHIELD.coverSideOffset,
  };
}

/** Do not force ranged mobs to cross the whole level for distant tanks. */
export function coverIsClose(shooter: Readonly<ShieldPoint>, tank: Readonly<ShieldPoint>): boolean {
  return Math.hypot(shooter.x - tank.x, shooter.y - tank.y) <= TREANT_SHIELD.maxCoverDistance;
}

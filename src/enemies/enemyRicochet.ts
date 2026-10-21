/** One-time Briar Hunter arrow ricochets. Other projectile types never bounce. */
export type RicochetAxis = 'x' | 'y';
export interface TravelVector { x: number; y: number }
export interface SurfaceCollision {
  left?: boolean; right?: boolean; up?: boolean; down?: boolean;
}
export interface RectBounds { x: number; y: number; width: number; height: number }

/** Reflect off a vertical (x) or horizontal (y) wall, retaining projectile speed. */
export function reflectArrow(velocity: TravelVector, axis: RicochetAxis): TravelVector {
  return axis === 'x' ? { x: -velocity.x, y: velocity.y } :
    { x: velocity.x, y: -velocity.y };
}

/** Use Arcade collision contact flags first, fall back to the nearest obstacle face. */
export function ricochetAxis(
  position: TravelVector, velocity: TravelVector, touching: SurfaceCollision,
  obstacle?: RectBounds,
): RicochetAxis {
  const alongX = Boolean(touching.left || touching.right);
  const alongY = Boolean(touching.up || touching.down);
  if (alongX !== alongY) return alongX ? 'x' : 'y';
  if (obstacle) {
    const horizontalPenetration = obstacle.width / 2 + 7 -
      Math.abs(position.x - obstacle.x);
    const verticalPenetration = obstacle.height / 2 + 7 -
      Math.abs(position.y - obstacle.y);
    if (Math.abs(horizontalPenetration - verticalPenetration) > 0.5)
      return horizontalPenetration < verticalPenetration ? 'x' : 'y';
  }
  return Math.abs(velocity.x) >= Math.abs(velocity.y) ? 'x' : 'y';
}

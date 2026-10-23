/** Geometry for the Root Tyrant's advancing, wavy underground roots. */
export interface RootPoint { x: number; y: number }
export interface RootBounds { x: number; y: number; width: number; height: number }

/** Keeps the first point on the Tyrant's shoulder and translates the whole
 * branch with its body. The end remains inside the arena. */
export function attachedRootLine(center: RootPoint, angle: number, length: number,
  bounds: RootBounds, shoulderOffset = 27): { start: RootPoint; end: RootPoint } {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const start = { x: center.x + dx * shoulderOffset, y: center.y + dy * shoulderOffset };
  return {
    start,
    end: {
      x: Math.max(bounds.x + 12, Math.min(bounds.x + bounds.width - 12,
        start.x + dx * length)),
      y: Math.max(bounds.y + 12, Math.min(bounds.y + bounds.height - 12,
        start.y + dy * length)),
    },
  };
}
/** A single elbowed limb instead of a wavy ground root. The curve reads as a
 * shoulder, forearm and hand even while its end is still extending. */
export function rootArmPoint(start: RootPoint, end: RootPoint, t: number,
  bendDirection: -1 | 1): RootPoint {
  const fraction = Math.max(0, Math.min(1, t));
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(82, distance * .18) * bendDirection;
  const control = {
    x: start.x + dx * .48 - dy / distance * bend,
    y: start.y + dy * .48 + dx / distance * bend,
  };
  const inverse = 1 - fraction;
  return {
    x: inverse * inverse * start.x + 2 * inverse * fraction * control.x +
      fraction * fraction * end.x,
    y: inverse * inverse * start.y + 2 * inverse * fraction * control.y +
      fraction * fraction * end.y,
  };
}

/** Predict where a moving hero will be when the falling leaf reaches the floor. */
export function predictLeafLanding(position: RootPoint, velocity: RootPoint,
  predictionMs: number, bounds: RootBounds, padding = 24): RootPoint {
  const seconds = Math.max(0, predictionMs) / 1000;
  return {
    x: Math.max(bounds.x + padding, Math.min(bounds.x + bounds.width - padding,
      position.x + velocity.x * seconds)),
    y: Math.max(bounds.y + padding, Math.min(bounds.y + bounds.height - padding,
      position.y + velocity.y * seconds)),
  };
}
/** The hitbox follows the advancing tip ONLY, not the entire telegraph. */
export function rootTipHits(
  previous: RootPoint, next: RootPoint, hero: RootPoint, radius: number,
): boolean {
  const dx = next.x - previous.x, dy = next.y - previous.y;
  const length2 = dx * dx + dy * dy;
  const projection = length2 <= 0 ? 0 : Math.max(0, Math.min(1,
    ((hero.x - previous.x) * dx + (hero.y - previous.y) * dy) / length2));
  const closest = {x: previous.x + projection * dx, y: previous.y + projection * dy};
  return Math.hypot(hero.x - closest.x, hero.y - closest.y) <= radius;
}

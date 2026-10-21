/** Geometry for the Root Tyrant's advancing, wavy underground roots. */
export interface RootPoint { x: number; y: number }
export function rootWavePoint(start: RootPoint, end: RootPoint, t: number): RootPoint {
  const fraction = Math.max(0, Math.min(1, t));
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  // Taper out both ends, with a branching sine wave between them.
  const offset = Math.sin(Math.PI * fraction) * Math.sin(fraction * Math.PI * 5) * 13;
  return {
    x: start.x + dx * fraction - dy / distance * offset,
    y: start.y + dy * fraction + dx / distance * offset,
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

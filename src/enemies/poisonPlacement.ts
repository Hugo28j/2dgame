/** Safe placement for Spore Alchemist's timed poison circles. */
export interface PoisonCircle { x: number; y: number; radius: number }
export interface PoisonBounds { x: number; y: number; width: number; height: number }
export const POISON_SPACING_MARGIN = 10;
export const POISON_MAX_PLACEMENT_ATTEMPTS = 36;
export function poisonZonesOverlap(a: PoisonCircle, b: PoisonCircle,
  margin = POISON_SPACING_MARGIN): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <
    a.radius + b.radius + margin;
}
/**
 * Keeps accepted zones separated from active pools and pending bottles.
 * Stops early if there is not enough space (never forces overlapping circles).
 */
export function selectPoisonLocations(
  count: number, radius: number, bounds: PoisonBounds,
  occupied: readonly PoisonCircle[], random: () => number = Math.random,
  firstTarget?: {x: number; y: number},
): PoisonCircle[] {
  const padding = radius + 12;
  const xMin = bounds.x + padding, xMax = bounds.x + bounds.width - padding;
  const yMin = bounds.y + padding, yMax = bounds.y + bounds.height - padding;
  if (xMax < xMin || yMax < yMin || count <= 0 || radius <= 0) return [];
  const locations: PoisonCircle[] = [];
  for (let i = 0; i < count; i++) {
    let found = false;
    for (let attempt = 0; attempt < POISON_MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const targeted = i === 0 && attempt === 0 && firstTarget;
      const x = targeted ? Math.max(xMin, Math.min(xMax, firstTarget.x)) :
        xMin + (xMax - xMin) * random();
      const y = targeted ? Math.max(yMin, Math.min(yMax, firstTarget.y)) :
        yMin + (yMax - yMin) * random();
      const candidate = {x, y, radius};
      if (![...occupied, ...locations].some(other => poisonZonesOverlap(candidate, other))) {
        locations.push(candidate);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return locations;
}

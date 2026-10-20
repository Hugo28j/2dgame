/** World 2 boss specials. Keep targeting and collision math testable
 * independently of Phaser and the frame rate.
 */
export const ICE_WALL = Object.freeze({
  worldId: 2, room: 25, warningMs: 650, speed: 970,
  thickness: 46, gapHalfHeight: 68,
  playerPadding: 12, everyVolleys: 10, damageMultiplier: 0.92,
});
export const HOMING_ORB = Object.freeze({
  worldId: 2, room: 10, lifetimeMs: 8000,
  speed: 156, turnRateRadiansPerSecond: 2.55,
  everyVolleys: 3, maxActive: 3, damageMultiplier: 0.62,
});

export interface Point2D { x: number; y: number }
export interface Box2D { x: number; y: number; width: number; height: number }

/** The ice wave occupies an entire vertical wall except for a visible dodge lane. */
export function wallGapCenter(playerY: number, bounds: Box2D, volley: number): number {
  const offset = volley % 2 === 0 ? -45 : 45;
  const min = bounds.y + ICE_WALL.gapHalfHeight + 22;
  const max = bounds.y + bounds.height - ICE_WALL.gapHalfHeight - 22;
  return Math.max(min, Math.min(max, playerY + offset));
}

export function wallXAt(startX: number, startAt: number, now: number,
  speed = ICE_WALL.speed): number {
  return startX + Math.max(0, now - startAt) * speed / 1000;
}

/** Collision against the two solid wall segments, not their safe passage. */
export function wallHitsCircle(
  wallX: number, gapY: number, player: Point2D, radius = 12,
  thickness = ICE_WALL.thickness, gapHalfHeight = ICE_WALL.gapHalfHeight,
): boolean {
  if (Math.abs(player.x - wallX) > thickness / 2 + radius) return false;
  return Math.abs(player.y - gapY) + radius > gapHalfHeight;
}

/** Turn at a limited rate: a player can outmaneuver the seeking orb.
 * The orb never teleports or snaps through a 180-degree turn.
 */
export function steerHomingHeading(
  previousAngle: number, from: Point2D, target: Point2D,
  deltaMs: number, rate = HOMING_ORB.turnRateRadiansPerSecond,
): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return previousAngle;
  const dx = target.x - from.x, dy = target.y - from.y;
  if (Math.hypot(dx, dy) < 0.001) return previousAngle;
  const desired = Math.atan2(dy, dx);
  const difference = Math.atan2(Math.sin(desired - previousAngle), Math.cos(desired - previousAngle));
  const limit = rate * Math.min(deltaMs, 100) / 1000;
  const turn = Math.max(-limit, Math.min(limit, difference));
  return previousAngle + turn;
}

export function orbExpired(startAt: number, now: number): boolean {
  return now >= startAt + HOMING_ORB.lifetimeMs;
}

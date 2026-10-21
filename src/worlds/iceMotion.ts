/** World 2 only: time-based ice steering shared by the player and enemy AI. */
export interface MotionVector { readonly x: number; readonly y: number }
export interface CollisionSides {
  readonly left?: boolean; readonly right?: boolean;
  readonly up?: boolean; readonly down?: boolean;
}
export interface IceSteering {
  readonly accelerationMs: number;
  readonly brakingMs: number;
  readonly glideMs: number;
}
export const ICE_PLAYER_STEERING: IceSteering = Object.freeze({
  accelerationMs: 115, brakingMs: 235, glideMs: 350,
});
export const ICE_ENEMY_STEERING: IceSteering = Object.freeze({
  accelerationMs: 165, brakingMs: 245, glideMs: 290,
});
/** Limit only movement directed further into a wall. */
export function unblockIceVelocity(
  velocity: MotionVector, sides: CollisionSides = {},
): MotionVector {
  const x = (sides.left && velocity.x < 0) || (sides.right && velocity.x > 0) ? 0 : velocity.x;
  const y = (sides.up && velocity.y < 0) || (sides.down && velocity.y > 0) ? 0 : velocity.y;
  return { x, y };
}
/** Frame-rate independent steering, with momentum when releasing movement. */
export function iceVelocity(
  previous: MotionVector, desired: MotionVector, deltaMs: number,
  steering: IceSteering, sides: CollisionSides = {},
): MotionVector {
  const dt = Number.isFinite(deltaMs) ? Math.max(0, Math.min(60, deltaMs)) : 0;
  const desiredSpeed = Math.hypot(desired.x, desired.y);
  const reversing = previous.x * desired.x + previous.y * desired.y < 0;
  const response = desiredSpeed < 0.001 ? steering.glideMs :
    reversing ? steering.brakingMs : steering.accelerationMs;
  const mix = 1 - Math.exp(-dt / Math.max(1, response));
  const result = unblockIceVelocity({
    x: previous.x + (desired.x - previous.x) * mix,
    y: previous.y + (desired.y - previous.y) * mix,
  }, sides);
  if (desiredSpeed < 0.001 && Math.hypot(result.x, result.y) < 1.3) return { x: 0, y: 0 };
  return result;
}

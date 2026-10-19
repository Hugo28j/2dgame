import type { Vector2Value } from '../input/vectorMath';

/** Velocity override for a short dash. Physics still handles walls and obstacles. */
export class DashState {
  private direction: Vector2Value = { x: 0, y: 0 };
  private expiresAt = 0;

  public begin(now: number, durationMs: number, direction: Readonly<Vector2Value>): boolean {
    const length = Math.hypot(direction.x, direction.y);
    if (!(length > 0.01) || !Number.isFinite(length) || durationMs <= 0) return false;
    this.direction = { x: direction.x / length, y: direction.y / length };
    this.expiresAt = now + durationMs;
    return true;
  }

  public velocity(now: number, speed: number): Vector2Value | null {
    if (now >= this.expiresAt) return null;
    return { x: this.direction.x * speed, y: this.direction.y * speed };
  }

  public cancel(): void {
    this.expiresAt = 0;
    this.direction = { x: 0, y: 0 };
  }
}

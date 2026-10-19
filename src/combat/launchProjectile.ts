/**
 * Arcade Physics Groups apply their defaults (including zero velocity) when
 * a child is added. Launch only AFTER membership has been established.
 */
export function addAndLaunch<T extends { setVelocity(x: number, y: number): unknown }>(
  group: { add(child: T): unknown },
  projectile: T,
  direction: Readonly<{ x: number; y: number }>,
  speed: number,
): T {
  group.add(projectile);
  const length = Math.hypot(direction.x, direction.y);
  if (length === 0 || !Number.isFinite(length) || !Number.isFinite(speed) || speed <= 0) {
    projectile.setVelocity(0, 0);
    return projectile;
  }
  projectile.setVelocity(direction.x / length * speed, direction.y / length * speed);
  return projectile;
}

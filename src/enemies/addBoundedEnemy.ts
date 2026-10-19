/**
 * Arcade Physics Group defaults can override the spawn-time world collision flag.
 * Restore that flag after adding each enemy to the physics group.
 */
export function addBoundedEnemy<T extends { setCollideWorldBounds(enabled: boolean): unknown }>(
  group: { add(enemy: T): unknown },
  enemy: T,
): T {
  group.add(enemy);
  enemy.setCollideWorldBounds(true);
  return enemy;
}

import type { Vector2Value } from '../input/vectorMath';
import { normalizeVector } from '../input/vectorMath';

export const getChaseVelocity = (
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  speed: number,
): Vector2Value => {
  const direction = normalizeVector(targetX - fromX, targetY - fromY);

  return {
    x: direction.x * speed,
    y: direction.y * speed,
  };
};

export const getObstacleAvoidanceVelocity = (
  blockedHorizontally: boolean,
  targetDeltaX: number,
  targetDeltaY: number,
  speed: number,
  fallbackSign: -1 | 1,
): Vector2Value => {
  if (blockedHorizontally) {
    const direction = Math.sign(targetDeltaY) || fallbackSign;
    return { x: 0, y: direction * speed };
  }

  const direction = Math.sign(targetDeltaX) || fallbackSign;
  return { x: direction * speed, y: 0 };
};

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

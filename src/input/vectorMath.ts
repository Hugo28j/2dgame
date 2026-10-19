export interface Vector2Value {
  x: number;
  y: number;
}

export const ZERO_VECTOR: Readonly<Vector2Value> = Object.freeze({ x: 0, y: 0 });

export const normalizeVector = (x: number, y: number): Vector2Value => {
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { ...ZERO_VECTOR };
  }

  return {
    x: x / length,
    y: y / length,
  };
};

export const clampVector = (x: number, y: number, maximum = 1): Vector2Value => {
  const length = Math.hypot(x, y);

  if (length === 0 || length <= maximum) {
    return { x, y };
  }

  const scale = maximum / length;
  return { x: x * scale, y: y * scale };
};

export const joystickVector = (
  deltaX: number,
  deltaY: number,
  radius: number,
  deadZone: number,
): Vector2Value => {
  const clamped = clampVector(deltaX, deltaY, radius);
  const strength = Math.hypot(clamped.x, clamped.y) / radius;

  if (strength <= deadZone) {
    return { ...ZERO_VECTOR };
  }

  return {
    x: clamped.x / radius,
    y: clamped.y / radius,
  };
};

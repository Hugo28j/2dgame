import { clampVector, type Vector2Value } from './vectorMath';

/** Both WASD (QWERTY) and ZQSD (AZERTY) are accepted at the same time. */
export interface MovementKeys {
  w: boolean;
  z: boolean;
  a: boolean;
  q: boolean;
  s: boolean;
  d: boolean;
}
export function keyboardMovement(keys: Readonly<MovementKeys>): Vector2Value {
  const horizontal = Number(keys.d) - Number(keys.a || keys.q);
  const vertical = Number(keys.s) - Number(keys.w || keys.z);
  return clampVector(horizontal, vertical);
}

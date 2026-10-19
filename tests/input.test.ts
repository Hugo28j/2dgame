import { describe, expect, it } from 'vitest';

import { PointerOwnership } from '../src/input/PointerOwnership';
import {
  clampVector,
  joystickVector,
  normalizeVector,
} from '../src/input/vectorMath';

describe('phase 1 vector input', () => {
  it('prevents diagonal movement from becoming faster', () => {
    const movement = clampVector(1, 1);

    expect(Math.hypot(movement.x, movement.y)).toBeCloseTo(1);
    expect(movement.x).toBeCloseTo(Math.SQRT1_2);
  });

  it('keeps joystick input inside its radius and applies a dead zone', () => {
    expect(joystickVector(4, 3, 50, 0.2)).toEqual({ x: 0, y: 0 });

    const fullTilt = joystickVector(100, 0, 50, 0.2);
    expect(fullTilt).toEqual({ x: 1, y: 0 });
  });

  it('normalizes aim independently of its distance', () => {
    expect(normalizeVector(30, 40)).toEqual({ x: 0.6, y: 0.8 });
  });
});

describe('phase 1 pointer ownership', () => {
  it('never lets another finger take over an active joystick', () => {
    const ownership = new PointerOwnership();

    expect(ownership.claim(1)).toBe(true);
    expect(ownership.claim(2)).toBe(false);
    expect(ownership.ownerId).toBe(1);
    expect(ownership.release(2)).toBe(false);
    expect(ownership.release(1)).toBe(true);
    expect(ownership.isOwned).toBe(false);
  });

  it('clears ownership during a global input reset', () => {
    const ownership = new PointerOwnership();
    ownership.claim(7);
    ownership.reset();

    expect(ownership.ownerId).toBeNull();
  });
});

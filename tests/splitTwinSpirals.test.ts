import { describe, expect, it } from 'vitest';
import { splitTwinShotAngle, shotAngles } from '../src/enemies/projectilePatterns';

describe('world 1 room 15 split boss spirals', () => {
  it('starts opposite and rotates in opposite directions at double speed', () => {
    const first = splitTwinShotAngle(0, 0);
    const second = splitTwinShotAngle(0, 1);
    expect(second - first).toBeCloseTo(Math.PI);
    expect(splitTwinShotAngle(1, 0) - first).toBeCloseTo(Math.PI / 3);
    expect(splitTwinShotAngle(1, 1) - second).toBeCloseTo(-Math.PI / 3);
    expect(shotAngles('spiral', 0, 1)[0]).toBeCloseTo(Math.PI / 6);
  });
  it('keeps each later volley rotating continuously', () => {
    for (let volley = 1; volley < 8; volley++) {
      expect(splitTwinShotAngle(volley, 0) - splitTwinShotAngle(volley - 1, 0))
        .toBeCloseTo(Math.PI / 3);
      expect(splitTwinShotAngle(volley, 1) - splitTwinShotAngle(volley - 1, 1))
        .toBeCloseTo(-Math.PI / 3);
    }
  });
});

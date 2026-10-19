import { describe, expect, it } from 'vitest';

import { InvulnerabilityWindow } from '../src/combat/InvulnerabilityWindow';
import { ARENA_BOUNDS } from '../src/config/gameplay';
import { SLIME_CONFIG, SLIME_SPAWN_POINTS } from '../src/enemies/enemyConfig';
import { getChaseVelocity } from '../src/enemies/slimeMovement';

describe('phase 3 slime movement', () => {
  it('chases at the configured speed without a diagonal speed bonus', () => {
    const velocity = getChaseVelocity(0, 0, 10, 10, SLIME_CONFIG.movementSpeed);

    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(SLIME_CONFIG.movementSpeed);
    expect(velocity.x).toBeCloseTo(velocity.y);
  });

  it('keeps all initial spawns inside the arena', () => {
    for (const point of SLIME_SPAWN_POINTS) {
      expect(point.x).toBeGreaterThan(ARENA_BOUNDS.x);
      expect(point.x).toBeLessThan(ARENA_BOUNDS.x + ARENA_BOUNDS.width);
      expect(point.y).toBeGreaterThan(ARENA_BOUNDS.y);
      expect(point.y).toBeLessThan(ARENA_BOUNDS.y + ARENA_BOUNDS.height);
    }
  });
});

describe('phase 3 player invulnerability', () => {
  it('blocks repeated contact hits only during the active window', () => {
    const window = new InvulnerabilityWindow();
    window.activate(1_000, 700);

    expect(window.isActive(1_000)).toBe(true);
    expect(window.isActive(1_699)).toBe(true);
    expect(window.isActive(1_700)).toBe(false);
  });

  it('never shortens an existing protection window', () => {
    const window = new InvulnerabilityWindow();
    window.activate(100, 1_000);
    window.activate(200, 100);

    expect(window.isActive(1_099)).toBe(true);
    expect(window.isActive(1_100)).toBe(false);
  });
});

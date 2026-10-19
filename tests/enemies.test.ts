import { describe, expect, it } from 'vitest';

import { InvulnerabilityWindow } from '../src/combat/InvulnerabilityWindow';
import { SLIME_CONFIG } from '../src/enemies/enemyConfig';
import {
  getChaseVelocity,
  getObstacleAvoidanceVelocity,
} from '../src/enemies/slimeMovement';
import { SAFE_SPAWN_DISTANCE, getRoomDefinition } from '../src/rooms/roomConfig';

describe('phase 3 slime movement', () => {
  it('chases at the configured speed without a diagonal speed bonus', () => {
    const velocity = getChaseVelocity(0, 0, 10, 10, SLIME_CONFIG.movementSpeed);

    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(SLIME_CONFIG.movementSpeed);
    expect(velocity.x).toBeCloseTo(velocity.y);
  });

  it('keeps initial spawns a safe distance from the player', () => {
    const room = getRoomDefinition(1);
    for (const point of room.enemySpawns) {
      const distance = Math.hypot(
        point.x - room.layout.playerSpawn.x,
        point.y - room.layout.playerSpawn.y,
      );
      expect(distance).toBeGreaterThanOrEqual(SAFE_SPAWN_DISTANCE);
    }
  });

  it('sidesteps at full speed when an obstacle blocks the chase line', () => {
    expect(getObstacleAvoidanceVelocity(true, 0, 50, 60, -1)).toEqual({ x: 0, y: 60 });
    expect(getObstacleAvoidanceVelocity(false, -50, 0, 60, 1)).toEqual({ x: -60, y: 0 });
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

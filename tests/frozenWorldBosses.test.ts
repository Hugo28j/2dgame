import { describe, expect, it } from 'vitest';
import { getWorldBossName } from '../src/worlds/worldConfig';
import { ICE_WALL, HOMING_ORB, orbExpired, steerHomingHeading,
  wallGapCenter, wallHitsCircle, wallXAt } from '../src/enemies/frozenBossAttacks';

describe('Frozen Hollow unique bosses', () => {
  it('keeps Crystal Empress on room 25 and Blizzard Tyrant on room 10', () => {
    expect(getWorldBossName(2, ICE_WALL.room)).toBe('Crystal Empress');
    expect(getWorldBossName(2, HOMING_ORB.room)).toBe('Blizzard Tyrant');
    expect(ICE_WALL.worldId).toBe(2);
    expect(HOMING_ORB.worldId).toBe(2);
  });
  it('warns briefly, sends a fast wall across the entire arena, and retains a safe gap', () => {
    const bounds = { x: 20, y: 40, width: 800, height: 1100 };
    expect(ICE_WALL.warningMs).toBeLessThan(800);
    expect(ICE_WALL.speed).toBeGreaterThan(850);
    const gap = wallGapCenter(450, bounds, 0);
    expect(gap).toBeGreaterThan(bounds.y + ICE_WALL.gapHalfHeight);
    expect(gap).toBeLessThan(bounds.y + bounds.height - ICE_WALL.gapHalfHeight);
    const x = wallXAt(bounds.x - ICE_WALL.thickness, 1000, 2100);
    expect(x).toBeGreaterThan(bounds.x + bounds.width);
    expect(wallHitsCircle(240, gap, { x: 240, y: gap }, 12)).toBe(false);
    expect(wallHitsCircle(240, gap, { x: 240, y: gap + 50 }, 12)).toBe(false);
    expect(wallHitsCircle(240, gap, { x: 240, y: gap + 65 }, 12)).toBe(true);
    expect(wallHitsCircle(240, gap, { x: 340, y: 250 }, 12)).toBe(false);
    expect(wallGapCenter(40, bounds, 0)).toBeGreaterThan(40);
  });
  it('lets an 8-second seeker turn toward a moving hero without instant snapping', () => {
    expect(HOMING_ORB.lifetimeMs).toBe(8000);
    expect(orbExpired(1000, 8999)).toBe(false);
    expect(orbExpired(1000, 9000)).toBe(true);
    const turned = steerHomingHeading(0, { x: 0, y: 0 }, { x: 0, y: 200 }, 16);
    expect(turned).toBeGreaterThan(0);
    expect(turned).toBeLessThan(0.1);
    expect(steerHomingHeading(0, { x: 0, y: 0 }, { x: -100, y: 0 }, 16))
      .toBeLessThan(Math.PI / 2);
    expect(steerHomingHeading(0, { x: 0, y: 0 }, { x: 0, y: 100 }, 0)).toBe(0);
  });
});

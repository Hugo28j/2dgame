import { describe, expect, it } from 'vitest';
import { iceVelocity, ICE_PLAYER_STEERING, ICE_ENEMY_STEERING } from '../src/worlds/iceMotion';
import { frozenPlates } from '../src/worlds/iceFloorArt';
import { getWorld } from '../src/worlds/worldConfig';
import { getRoomDefinition } from '../src/rooms/roomConfig';

describe('phase 2: Frozen Hollow ice mechanics', () => {
  it('keeps other world palettes unchanged', () => {
    expect(getWorld(2).floor).toBe(0xd9f1fa);
    expect(getWorld(1).floor).toBe(0x10271d);
    expect(getWorld(3).floor).toBe(0x331b1c);
  });

  it('lays staggered white-blue plates inside every tested ice arena', () => {
    for (const room of [1, 7, 19, 30]) {
      const bounds = getRoomDefinition(room, 2).layout.bounds;
      const plates = frozenPlates(bounds, room);
      expect(plates.length).toBeGreaterThan(12);
      expect(new Set(plates.map(plate => plate.shade)).size).toBe(5);
      expect(frozenPlates(bounds, room)).toEqual(plates);
      for (const plate of plates) {
        expect(plate.x).toBeGreaterThanOrEqual(bounds.x);
        expect(plate.y).toBeGreaterThanOrEqual(bounds.y);
        expect(plate.x + plate.width).toBeLessThanOrEqual(bounds.x + bounds.width);
        expect(plate.y + plate.height).toBeLessThanOrEqual(bounds.y + bounds.height);
      }
    }
  });

  it('keeps sliding briefly after the player stops moving, then slows to zero', () => {
    const released = iceVelocity({ x: 200, y: 0 }, { x: 0, y: 0 }, 16, ICE_PLAYER_STEERING);
    expect(released.x).toBeGreaterThan(150);
    expect(released.x).toBeLessThan(200);
    let current = released;
    for (let i = 0; i < 120; i++)
      current = iceVelocity(current, { x: 0, y: 0 }, 16, ICE_PLAYER_STEERING);
    expect(current).toEqual({ x: 0, y: 0 });
  });

  it('changes direction progressively rather than snapping backwards instantly', () => {
    const first = iceVelocity({ x: 200, y: 0 }, { x: -200, y: 0 },
      16, ICE_PLAYER_STEERING);
    expect(first.x).toBeGreaterThan(0);
    let current = first;
    for (let i = 0; i < 75; i++)
      current = iceVelocity(current, { x: -200, y: 0 }, 16, ICE_PLAYER_STEERING);
    expect(current.x).toBeLessThan(-180);
  });

  it('gives monsters inertia while allowing them to escape walls', () => {
    const moving = iceVelocity({ x: 95, y: 0 }, { x: 0, y: 0 },
      16, ICE_ENEMY_STEERING);
    expect(moving.x).toBeGreaterThan(0);
    expect(iceVelocity({ x: -120, y: 0 }, { x: -120, y: 70 },
      16, ICE_ENEMY_STEERING, { left: true }).x).toBe(0);
    expect(iceVelocity({ x: 0, y: 100 }, { x: 60, y: 100 },
      16, ICE_ENEMY_STEERING, { down: true }).y).toBe(0);
    expect(iceVelocity({ x: 0, y: 0 }, { x: 90, y: 0 },
      16, ICE_ENEMY_STEERING, { left: true }).x).toBeGreaterThan(0);
  });

  it('responds consistently across mobile and desktop frame intervals', () => {
    let at60 = { x: 0, y: 0 };
    let at30 = { x: 0, y: 0 };
    for (let i = 0; i < 60; i++)
      at60 = iceVelocity(at60, { x: 250, y: 0 }, 16, ICE_PLAYER_STEERING);
    for (let i = 0; i < 30; i++)
      at30 = iceVelocity(at30, { x: 250, y: 0 }, 32, ICE_PLAYER_STEERING);
    expect(at60.x).toBeCloseTo(at30.x, 5);
  });
});

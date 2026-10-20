import { describe, it, expect } from 'vitest';
import { SHIELD_MAX_HP, absorbWithShield } from '../src/abilities/ShieldHealth';
import { findTeleportDestination, safeBombBlastDistance } from '../src/abilities/teleportDestination';
import { AbilityCooldowns } from '../src/abilities/AbilityCooldowns';
import { ABILITIES } from '../src/abilities/abilityConfig';

describe('Guardian shield bubble', () => {
  it('has 50 maximum HP, does not stack, and damage drains shield first', () => {
    expect(SHIELD_MAX_HP).toBe(50);
    expect(absorbWithShield(100, 50, 30)).toEqual({ health: 100, shield: 20, defeated: false });
    expect(absorbWithShield(100, 20, 30)).toEqual({ health: 90, shield: 0, defeated: false });
    expect(absorbWithShield(12, 0, 15)).toEqual({ health: 0, shield: 0, defeated: true });
    expect(ABILITIES['guardian-charge'].kind).toBe('shield');
    expect(ABILITIES['guardian-charge'].cooldownMs).toBe(30000);
  });
});
describe('Mage teleport and thrown bomb', () => {
  const bounds = { x: 0, y: 0, width: 400, height: 400 };
  it('teleports without moving to a point inside an obstacle or through the arena edge', () => {
    const origin = { x: 100, y: 100 };
    expect(findTeleportDestination(origin, { x: 1, y: 0 }, 150, bounds, [])).toEqual({ x: 250, y: 100 });
    const blocked = findTeleportDestination(origin, { x: 1, y: 0 }, 150, bounds, [
      { x: 250, y: 100, width: 60, height: 90 },
    ]);
    expect(blocked.x).toBeLessThanOrEqual(200);
    expect(findTeleportDestination(origin, { x: 0, y: -1 }, 150, bounds, []).y).toBeGreaterThanOrEqual(20);
    expect(findTeleportDestination(origin, { x: 0, y: 0 }, 150, bounds, [])).toEqual(origin);
  });
  it('requires bomb travel distance larger than blast radius', () => {
    expect(safeBombBlastDistance(115)).toBe(160);
    expect(safeBombBlastDistance(185)).toBe(230);
    expect(ABILITIES['mage-blink'].kind).toBe('teleport');
  });
});
describe('Wave-clear cooldown pause', () => {
  it('freezes remaining seconds and resumes on the next wave, even across long gaps', () => {
    const timer = new AbilityCooldowns();
    expect(timer.activate('mage-timewarp', 1000, 34000, 1)).toBe(true);
    timer.pause(5000);
    expect(timer.remainingMs('mage-timewarp', 80000)).toBe(30000);
    expect(timer.remainingMs('mage-timewarp', 90000)).toBe(30000);
    timer.resume(90000);
    expect(timer.remainingMs('mage-timewarp', 90000)).toBe(30000);
    expect(timer.remainingMs('mage-timewarp', 120000)).toBe(0);
  });
  it('keeps cooldowns frozen when a ready ability is cast between waves', () => {
    const timer = new AbilityCooldowns();
    timer.pause(1000);
    expect(timer.activate('guardian-charge', 5000, 30000, 1)).toBe(true);
    expect(timer.remainingMs('guardian-charge', 700000)).toBe(30000);
    timer.resume(700000);
    expect(timer.remainingMs('guardian-charge', 700500)).toBe(29500);
    timer.pause(701000);
    timer.pause(701500);
    expect(timer.remainingMs('guardian-charge', 900000)).toBe(29000);
  });
});

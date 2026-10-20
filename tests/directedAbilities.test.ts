import { describe, expect, it } from 'vitest';
import { inForwardRectangle, normalizedDirection, rayHitsCircle } from '../src/abilities/directedGeometry';
import { ABILITIES, isAimedAbility } from '../src/abilities/abilityConfig';
import { HEROES } from '../src/heroes/heroConfig';
import { SLIME_CONFIG } from '../src/enemies/enemyConfig';

describe('directed hero abilities and combat balance', () => {
  it('uses forward rectangular collision for wind, never a circle behind the hero', () => {
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, 150, 30, 210, 45)).toBe(true);
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, 20, 55, 210, 45)).toBe(false);
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, -10, 0, 210, 45)).toBe(false);
    expect(inForwardRectangle(0, 0, { x: 0, y: -1 }, 10, -180, 210, 45)).toBe(true);
  });
  it('uses ray collision for each shotgun pellet', () => {
    expect(rayHitsCircle(0, 0, { x: 2, y: 0 }, 120, 10, 15, 250)).toBe(true);
    expect(rayHitsCircle(0, 0, { x: 1, y: 0 }, 120, 30, 15, 250)).toBe(false);
    expect(rayHitsCircle(0, 0, { x: 1, y: 0 }, -5, 0, 15, 250)).toBe(false);
    expect(normalizedDirection({ x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
  });
  it('makes the offensive skills aimable, and gives powerful buffs long cooldowns', () => {
    expect(isAimedAbility(ABILITIES['guardian-slam'].kind)).toBe(true);
    expect(isAimedAbility(ABILITIES['ranger-rain'].kind)).toBe(true);
    expect(isAimedAbility(ABILITIES['mage-burst'].kind)).toBe(true);
    expect(isAimedAbility(ABILITIES['frost-ring'].kind)).toBe(false);
    expect(ABILITIES['ranger-volley'].cooldownMs).toBeGreaterThanOrEqual(45000);
    expect(ABILITIES['storm-pulse'].cooldownMs).toBeGreaterThanOrEqual(30000);
  });
  it('makes starter slimes faster while keeping all heroes mobile', () => {
    expect(SLIME_CONFIG.movementSpeed).toBeGreaterThanOrEqual(100);
    expect(SLIME_CONFIG.movementSpeed).toBeLessThan(HEROES.guardian.stats.movementSpeed);
  });
});

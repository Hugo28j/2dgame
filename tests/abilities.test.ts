import { describe, expect, it } from 'vitest';

import { AbilityCooldowns } from '../src/abilities/AbilityCooldowns';
import {
  ABILITIES, ABILITY_IDS, HERO_ABILITIES, getAbilityStats, isAbilityUnlocked,
} from '../src/abilities/abilityConfig';
import { HERO_IDS } from '../src/heroes/heroConfig';
import { targetsInRadius } from '../src/abilities/areaTargets';
import { DashState } from '../src/abilities/DashState';

describe('phase 6 ability rules', () => {
  it('provides precisely three unique abilities for every hero', () => {
    expect(ABILITY_IDS).toHaveLength(21);
    for (const heroId of HERO_IDS) {
      expect(HERO_ABILITIES[heroId]).toHaveLength(3);
      for (const id of HERO_ABILITIES[heroId]) {
        expect(ABILITIES[id].heroId).toBe(heroId);
        expect(ABILITIES[id].slot).toBeGreaterThanOrEqual(1);
        expect(ABILITIES[id].cooldownMs).toBeGreaterThan(0);
      }
    }
  });

  it('unlocks personal ability slots at hero levels 5, 20 and 30', () => {
    for (const heroId of HERO_IDS) {
      const [first, second, third] = HERO_ABILITIES[heroId];
      expect(isAbilityUnlocked(first, 4)).toBe(false);
      expect(isAbilityUnlocked(first, 5)).toBe(true);
      expect(isAbilityUnlocked(second, 19)).toBe(false);
      expect(isAbilityUnlocked(second, 20)).toBe(true);
      expect(isAbilityUnlocked(third, 29)).toBe(false);
      expect(isAbilityUnlocked(third, 30)).toBe(true);
      expect(getAbilityStats(first, 20).cooldownMs).toBeLessThan(ABILITIES[first].cooldownMs);
    }
  });

  it('keeps every configured ability valid', () => {
    for (const id of ABILITY_IDS) {
      expect(ABILITIES[id].cooldownMs).toBeGreaterThan(0);
    }
  });

  it('starts abilities ready, locks them after casting and prevents repeated casts', () => {
    const cooldowns = new AbilityCooldowns();
    expect(cooldowns.ready('guardian-charge', 0)).toBe(true);
    expect(cooldowns.activate('guardian-charge', 1000, 4800, 1)).toBe(true);
    expect(cooldowns.activate('guardian-charge', 1001, 4800, 1)).toBe(false);
    expect(cooldowns.remainingMs('guardian-charge', 1001)).toBe(4799);
    expect(cooldowns.ready('guardian-slam', 1001)).toBe(true);
    expect(cooldowns.ready('guardian-charge', 5800)).toBe(true);
    expect(cooldowns.activate('guardian-charge', 5800, 4800, 1)).toBe(true);
  });

  it('uses hero cooldown modifier without allowing invalid values', () => {
    const cooldowns = new AbilityCooldowns();
    expect(cooldowns.activate('frost-ring', 300, 11000, 0)).toBe(false);
    expect(cooldowns.activate('frost-ring', 300, 11000, Number.NaN)).toBe(false);
    expect(cooldowns.activate('frost-ring', 300, 11000, 0.9)).toBe(true);
    expect(cooldowns.remainingMs('frost-ring', 300)).toBe(9900);
    expect(cooldowns.remainingMs('frost-ring', 10200)).toBe(0);
    cooldowns.clear();
    expect(cooldowns.ready('frost-ring', 300)).toBe(true);
  });

  it('dashes along a normalized movement vector and stops after its duration', () => {
    const dash = new DashState();
    expect(dash.begin(100, 200, { x: 3, y: 4 })).toBe(true);
    expect(dash.velocity(100, 100)).toEqual({ x: 60, y: 80 });
    expect(dash.velocity(299, 100)).toEqual({ x: 60, y: 80 });
    expect(dash.velocity(300, 100)).toBeNull();
    dash.begin(400, 200, { x: 1, y: 0 });
    dash.cancel();
    expect(dash.velocity(401, 100)).toBeNull();
    expect(dash.begin(500, 200, { x: 0, y: 0 })).toBe(false);
  });

  it('selects each enemy once by circular range, including the exact edge', () => {
    const entities = [
      { id: 'a', x: 10, y: 0 }, { id: 'b', x: 0, y: 10 },
      { id: 'c', x: 11, y: 0 }, { id: 'd', x: -2, y: 0 },
    ];
    expect(targetsInRadius(0, 0, 10, entities).map(x => x.id)).toEqual(['a', 'b', 'd']);
    expect(targetsInRadius(0, 0, 0, entities)).toEqual([]);
  });
});

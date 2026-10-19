import { describe, expect, it } from 'vitest';

import { AbilityCooldowns } from '../src/abilities/AbilityCooldowns';
import { ABILITIES, ABILITY_SLOTS } from '../src/abilities/abilityConfig';
import { targetsInRadius } from '../src/abilities/areaTargets';
import { DashState } from '../src/abilities/DashState';

describe('phase 6 ability rules', () => {
  it('provides precisely three available abilities with independently configured cooldowns', () => {
    expect(ABILITY_SLOTS).toEqual(['dash', 'fire-nova', 'ice-blast']);
    for (const id of ABILITY_SLOTS) {
      expect(ABILITIES[id].available).toBe(true);
      expect(ABILITIES[id].cooldownMs).toBeGreaterThan(0);
    }
  });

  it('starts abilities ready, locks them after casting and prevents repeated casts', () => {
    const cooldowns = new AbilityCooldowns();
    expect(cooldowns.ready('dash', 0)).toBe(true);
    expect(cooldowns.activate('dash', 1000, 1)).toBe(true);
    expect(cooldowns.activate('dash', 1001, 1)).toBe(false);
    expect(cooldowns.remainingMs('dash', 1001)).toBe(4799);
    expect(cooldowns.ready('fire-nova', 1001)).toBe(true);
    expect(cooldowns.ready('dash', 5800)).toBe(true);
    expect(cooldowns.activate('dash', 5800, 1)).toBe(true);
  });

  it('uses hero cooldown modifier without allowing invalid values', () => {
    const cooldowns = new AbilityCooldowns();
    expect(cooldowns.activate('ice-blast', 300, 0)).toBe(false);
    expect(cooldowns.activate('ice-blast', 300, Number.NaN)).toBe(false);
    expect(cooldowns.activate('ice-blast', 300, 0.9)).toBe(true);
    expect(cooldowns.remainingMs('ice-blast', 300)).toBe(9900);
    expect(cooldowns.remainingMs('ice-blast', 10200)).toBe(0);
    cooldowns.clear();
    expect(cooldowns.ready('ice-blast', 300)).toBe(true);
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

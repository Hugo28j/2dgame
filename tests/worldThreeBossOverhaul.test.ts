import { describe, expect, it } from 'vitest';
import { getWorldBossName } from '../src/worlds/worldConfig';
import { EMBER_BOSS_ATTACKS, getEmberBossAttack,
  laserDirection, pointToLaserDistance } from '../src/enemies/emberBosses';

describe('Ember Wastes boss overhaul', () => {
  it('assigns seven distinct characters to the six boss rooms', () => {
    const encounters = [
      [5, 0, 'Helios Spinner', 'spinning-lasers'],
      [10, 0, 'Cinder Mortar', 'ground-fireball'],
      [15, 0, 'Furnace Artillerist', 'edge-cannons'],
      [15, 1, 'Pentaflare Sentinel', 'pentaflare'],
      [20, 0, 'Lava Broodmother', 'lava-summon'],
      [25, 0, 'Caldera Queen', 'lava-geysers'],
      [30, 0, 'Heart of Inferno', 'furnace-wave'],
    ] as const;
    for (const [room, slot, name, attack] of encounters) {
      expect(getWorldBossName(3, room, slot)).toBe(name);
      expect(getEmberBossAttack(room, slot)).toBe(attack);
    }
    expect(new Set(encounters.map(([, , name]) => name)).size).toBe(7);
  });

  it('switches the rotating laser direction every cast', () => {
    expect([0, 1, 2, 3].map(laserDirection)).toEqual([1, -1, 1, -1]);
    expect(pointToLaserDistance(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(pointToLaserDistance(15, 0, 0, 0, 10, 0)).toBe(5);
    expect(EMBER_BOSS_ATTACKS.laserWarningMs).toBeGreaterThanOrEqual(600);
  });

  it('configures ten-way fireball bursts, five-shot pressure and bounded summons', () => {
    expect(EMBER_BOSS_ATTACKS.groundBurstCount).toBe(10);
    expect(EMBER_BOSS_ATTACKS.pentaflareIntervalMs).toBeLessThan(500);
    expect(EMBER_BOSS_ATTACKS.lavaSummonCap).toBe(3);
    expect(EMBER_BOSS_ATTACKS.cannonWarningMs).toBeGreaterThanOrEqual(650);
  });
});

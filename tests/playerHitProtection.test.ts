import { describe, expect, it } from 'vitest';
import { InvulnerabilityWindow } from '../src/combat/InvulnerabilityWindow';
import { PLAYER_HIT_INVULNERABILITY_MS, playerHitProtectionMs } from '../src/combat/playerHitProtection';

describe('player hit invulnerability', () => {
  it('grants a minimum 1000ms no-matter-which-enemy window', () => {
    expect(PLAYER_HIT_INVULNERABILITY_MS).toBe(1000);
    for (const interval of [0, 35, 80, 150, 420, 650, 999, NaN, Infinity]) {
      expect(playerHitProtectionMs(interval)).toBe(1000);
    }
    expect(playerHitProtectionMs(1500)).toBe(1500);
    expect(playerHitProtectionMs(3500)).toBe(3500);
  });

  it('blocks fast repeated collision, projectile and AoE hits during the same window', () => {
    const invulnerability = new InvulnerabilityWindow();
    const firstHitAt = 2000;
    expect(invulnerability.isActive(firstHitAt)).toBe(false);
    invulnerability.activate(firstHitAt, playerHitProtectionMs(120));
    for (const againAt of [2000, 2016, 2030, 2110, 2500, 2999]) {
      expect(invulnerability.isActive(againAt)).toBe(true);
    }
    expect(invulnerability.isActive(3000)).toBe(false);
    invulnerability.activate(3000, playerHitProtectionMs(850));
    expect(invulnerability.isActive(3500)).toBe(true);
    invulnerability.reset();
    expect(invulnerability.isActive(3500)).toBe(false);
  });

  it('does not shorten already active dash / skill invulnerability', () => {
    const invulnerability = new InvulnerabilityWindow();
    invulnerability.activate(5000, 1800);
    invulnerability.activate(5500, playerHitProtectionMs(100));
    expect(invulnerability.isActive(6700)).toBe(true);
    expect(invulnerability.isActive(6799)).toBe(true);
    expect(invulnerability.isActive(6800)).toBe(false);
  });
});

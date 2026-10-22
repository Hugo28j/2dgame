import { describe, expect, it } from 'vitest';
import { InvulnerabilityWindow } from '../src/combat/InvulnerabilityWindow';
import { PLAYER_HIT_INVULNERABILITY_MS, applyProtectedPlayerHit, playerHitProtectionMs } from '../src/combat/playerHitProtection';

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

describe('health-layer i-frame regression', () => {
  it('protects the hero immediately when the first hit changes shield or health', () => {
    const window = new InvulnerabilityWindow();
    const first = applyProtectedPlayerHit(2000, 100, 50, 30, window);
    expect(first).toEqual({ health: 100, shield: 20, defeated: false, accepted: true });
    expect(window.isActive(2000)).toBe(true);
    // Multiple contact enemies, projectiles and AoE blasts in adjacent frames
    // cannot drain HP while the post-hit protection is active.
    for (const at of [2000, 2016, 2050, 2100, 2600, 2999]) {
      expect(applyProtectedPlayerHit(at, first.health, first.shield, 80, window))
        .toEqual({ ...first, accepted: false });
    }
    expect(applyProtectedPlayerHit(3000, first.health, first.shield, 80, window))
      .toEqual({ health: 40, shield: 0, defeated: false, accepted: true });
  });

  it('keeps dash immunity authoritative and permits damage after it expires', () => {
    const window = new InvulnerabilityWindow();
    window.activate(1000, 180);
    expect(applyProtectedPlayerHit(1100, 100, 0, 25, window).accepted).toBe(false);
    const received = applyProtectedPlayerHit(1180, 100, 0, 25, window);
    expect(received).toEqual({ health: 75, shield: 0, defeated: false, accepted: true });
    expect(window.isActive(2179)).toBe(true);
    expect(window.isActive(2180)).toBe(false);
  });

  it('never resets on repeated hits, blocks invalid damage and stops at death', () => {
    const window = new InvulnerabilityWindow();
    expect(applyProtectedPlayerHit(100, 25, 0, 0, window).accepted).toBe(false);
    expect(window.isActive(110)).toBe(false);
    expect(applyProtectedPlayerHit(100, 25, 0, Number.NaN, window).accepted).toBe(false);
    const lethal = applyProtectedPlayerHit(100, 25, 0, 30, window);
    expect(lethal).toEqual({ health: 0, shield: 0, defeated: true, accepted: true });
    expect(applyProtectedPlayerHit(1500, 0, 0, 10, window).accepted).toBe(false);
  });
});

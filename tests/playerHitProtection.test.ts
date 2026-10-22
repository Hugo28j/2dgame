import { describe, expect, it } from 'vitest';
import { InvulnerabilityWindow } from '../src/combat/InvulnerabilityWindow';
import { applyPlayerHit } from '../src/combat/playerHitProtection';
import { contactHitReady, nextContactHitAt } from '../src/combat/enemyContactDamage';

describe('no automatic player i-frames after taking damage', () => {
  it('allows three separate bullets to damage health in the very same frame', () => {
    const window = new InvulnerabilityWindow();
    let hp = 100, shield = 0;
    for (const damage of [22, 26, 33]) {
      const result = applyPlayerHit(2000, hp, shield, damage, window);
      expect(result.accepted).toBe(true);
      hp = result.health; shield = result.shield;
    }
    expect(hp).toBe(19);
    expect(window.isActive(2000)).toBe(false);
    expect(window.isActive(2016)).toBe(false);
    expect(applyPlayerHit(2001, hp, shield, 19, window)).toEqual({
      health: 0, shield: 0, defeated: true, accepted: true,
    });
  });

  it('multiple shots deplete the shield then immediately reduce HP', () => {
    const window = new InvulnerabilityWindow();
    const first = applyPlayerHit(500, 100, 50, 30, window);
    expect(first).toEqual({health:100, shield:20, defeated:false, accepted:true});
    const second = applyPlayerHit(500, first.health, first.shield, 45, window);
    expect(second).toEqual({health:75, shield:0, defeated:false, accepted:true});
    const third = applyPlayerHit(500, second.health, second.shield, 25, window);
    expect(third).toEqual({health:50, shield:0, defeated:false, accepted:true});
    expect(window.isActive(500)).toBe(false);
  });

  it('retains ONLY explicitly activated dash/skill invulnerability', () => {
    const window = new InvulnerabilityWindow();
    window.activate(1000, 180);
    expect(applyPlayerHit(1100, 100, 0, 25, window).accepted).toBe(false);
    expect(applyPlayerHit(1179, 100, 0, 25, window).accepted).toBe(false);
    const first = applyPlayerHit(1180, 100, 0, 25, window);
    const second = applyPlayerHit(1180, first.health, first.shield, 25, window);
    expect(first.health).toBe(75);
    expect(second.health).toBe(50);
    expect(window.isActive(1180)).toBe(false);
  });

  it('rejects invalid hits and does not allow damage after death', () => {
    const window = new InvulnerabilityWindow();
    for (const invalid of [0, -5, NaN, Number.POSITIVE_INFINITY]) {
      expect(applyPlayerHit(100, 25, 0, invalid, window).accepted).toBe(false);
    }
    const lethal = applyPlayerHit(100, 25, 0, 30, window);
    expect(lethal).toEqual({health:0, shield:0, defeated:true, accepted:true});
    expect(applyPlayerHit(100, lethal.health, 0, 15, window).accepted).toBe(false);
  });
});

describe('separate contact cooldown for every physical enemy', () => {
  it('limits standing in one melee enemy without blocking other enemies', () => {
    const now = 1000;
    const nextForEnemyA = nextContactHitAt(now, 700);
    expect(nextForEnemyA).toBe(1700);
    expect(contactHitReady(now + 16, nextForEnemyA)).toBe(false);
    expect(contactHitReady(now + 699, nextForEnemyA)).toBe(false);
    expect(contactHitReady(now + 700, nextForEnemyA)).toBe(true);
    // Enemy B is independent, even if Enemy A just hit on the same frame.
    expect(contactHitReady(now, 0)).toBe(true);
  });

  it('does not extend any hero-wide immunity or suppress independent bullets', () => {
    const window = new InvulnerabilityWindow();
    const fromContact = applyPlayerHit(1000, 90, 0, 20, window);
    const fromBullet = applyPlayerHit(1000, fromContact.health, 0, 30, window);
    expect(fromBullet.health).toBe(40);
    expect(nextContactHitAt(1000, 0)).toBeGreaterThan(1000);
    expect(window.isActive(1000)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { calculateDamage, DamageSystem, type Damageable } from '../src/combat/damage';
import { HitRegistry } from '../src/combat/HitRegistry';
import { BOW_CONFIG, fireIntervalMs } from '../src/weapons/weaponConfig';

class TestTarget implements Damageable {
  public readonly defense = 25;
  public hp = 100;

  public receiveDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }
}

describe('phase 2 damage system', () => {
  const attack = {
    damage: 20,
    criticalChance: 0.25,
    criticalMultiplier: 2,
  };

  it('applies defense mitigation with a minimum of one damage', () => {
    expect(calculateDamage(attack, 25, 0.9)).toEqual({ amount: 16, critical: false });
    expect(calculateDamage({ ...attack, damage: 0 }, 999, 0.9).amount).toBe(1);
  });

  it('uses the supplied roll for deterministic critical hits', () => {
    expect(calculateDamage(attack, 0, 0.1)).toEqual({ amount: 40, critical: true });
    expect(calculateDamage(attack, 0, 0.25)).toEqual({ amount: 20, critical: false });
  });

  it('reports defeat through the shared damage application path', () => {
    const target = new TestTarget();
    const system = new DamageSystem();
    const result = system.apply(target, { damage: 200, criticalChance: 0, criticalMultiplier: 2 }, 1);

    expect(result.defeated).toBe(true);
    expect(target.hp).toBe(0);
  });
});

describe('phase 2 weapon configuration', () => {
  it('derives its cadence from shots per second', () => {
    expect(fireIntervalMs(4)).toBe(250);
    expect(() => fireIntervalMs(0)).toThrow('Fire rate must be greater than zero.');
  });

  it('allows each projectile to damage a target only once', () => {
    const hits = new HitRegistry();

    expect(hits.claim('target-a')).toBe(true);
    expect(hits.claim('target-a')).toBe(false);
    expect(hits.claim('target-b')).toBe(true);
  });

  it('keeps the bow behavior data-driven', () => {
    expect(BOW_CONFIG.id).toBe('bow');
    expect(BOW_CONFIG.fireRate).toBeGreaterThan(0);
    expect(BOW_CONFIG.projectileSpeed).toBeGreaterThan(0);
    expect(BOW_CONFIG.projectileCount).toBe(1);
  });
});

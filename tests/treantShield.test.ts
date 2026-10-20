import { describe, it, expect } from 'vitest';
import {
  TREANT_SHIELD, shieldEndpoints, shieldInterceptFraction,
  firstShieldOnPath, rangedCoverSpot, coverIsClose,
} from '../src/enemies/treantShield';
import { DamageSystem } from '../src/combat/damage';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';

describe('Ancient Treant directional shield', () => {
  const tank = { x: 100, y: 100, facingX: -1, facingY: 0, id: 'treant' };
  const friend = { x: 170, y: 100 };
  const hero = { x: -50, y: 100 };

  it('intercepts incoming player shots before protected teammates', () => {
    expect(shieldInterceptFraction(hero, friend, tank)).toBeDefined();
    expect(firstShieldOnPath(hero, friend, [tank])).toBe(tank);
    expect(shieldInterceptFraction(hero, { x: 100, y: 100 }, tank)).toBeDefined();
  });

  it('does not block hits from behind, wide side angles, or shots that stop before the plate', () => {
    expect(shieldInterceptFraction(friend, hero, tank)).toBeUndefined();
    expect(shieldInterceptFraction({ x: -50, y: 165 }, { x: 170, y: 165 }, tank))
      .toBeUndefined();
    expect(shieldInterceptFraction(hero, { x: 0, y: 100 }, tank)).toBeUndefined();
  });

  it('uses the same shield edge geometry for visible render and shot hit detection', () => {
    const [a, b] = shieldEndpoints(tank);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(TREANT_SHIELD.halfWidth * 2);
    expect(shieldInterceptFraction({ x: -100, y: a.y }, { x: 100, y: a.y }, tank))
      .toBeDefined();
    expect(shieldInterceptFraction({ x: -100, y: a.y - 2 }, { x: 100, y: a.y - 2 }, tank))
      .toBeUndefined();
    const near = { ...tank, x: 20, id: 'near' };
    expect(firstShieldOnPath(hero, friend, [tank, near])).toBe(near);
  });

  it('keeps shield and enemy HP as one pool, without shield-only damage mitigation', () => {
    const stats = getEnemyStatsForRoom('tank', 17, 1);
    const damage = new DamageSystem();
    let currentHp = stats.maxHp;
    const receiver = {
      defense: stats.defense,
      receiveDamage: (amount: number) => {
        currentHp = Math.max(0, currentHp - amount);
        return currentHp === 0;
      },
    };
    const result = damage.apply(receiver, {
      damage: 80, criticalChance: 0, criticalMultiplier: 1,
    }, 1);
    expect(result.defeated).toBe(false);
    expect(currentHp).toBe(stats.maxHp - result.amount);
  });
});

describe('backline shooter cover AI', () => {
  const tank = { x: 100, y: 100, facingX: -1, facingY: 0 };

  it('chooses cover *behind* the Treant, opposite the player', () => {
    const spot = rangedCoverSpot(tank, 1);
    expect(spot.x).toBeGreaterThan(tank.x + 65);
    expect(Math.abs(spot.y - tank.y)).toBeLessThan(30);
    expect(firstShieldOnPath({ x: -50, y: 100 }, spot, [tank])).toBe(tank);
  });

  it('does not chase faraway shields across an entire room', () => {
    expect(coverIsClose({ x: 200, y: 100 }, tank)).toBe(true);
    expect(coverIsClose({ x: 460, y: 100 }, tank)).toBe(false);
  });
});

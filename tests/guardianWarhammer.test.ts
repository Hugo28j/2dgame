import { describe, expect, it } from 'vitest';
import { inForwardRectangle } from '../src/abilities/directedGeometry';
import { WARHAMMER_GROUND_SLAM, WEAPONS, fireIntervalMs, getWeaponStats } from '../src/weapons/weaponConfig';

describe('Guardian Bulwark Hammer ground slam', () => {
  it('is a powerful, very slow ground-crack attack, unlike the Dawnblade', () => {
    const hammer = getWeaponStats('warhammer', 1);
    const dawnblade = getWeaponStats('sunblade', 1);
    expect(hammer.attackMode).toBe('melee');
    expect(hammer.specialEffects).toContain('ground-crack');
    expect(hammer.specialEffects).toContain('slow');
    expect(hammer.specialEffects).not.toContain('knockback');
    expect(dawnblade.specialEffects).not.toContain('ground-crack');
    expect(hammer.damage).toBeGreaterThan(dawnblade.damage * 2);
    expect(fireIntervalMs(hammer.fireRate)).toBeGreaterThan(2200);
    expect(fireIntervalMs(hammer.fireRate)).toBeGreaterThan(fireIntervalMs(dawnblade.fireRate) * 3);
  });

  it('uses a big rectangle forward, with identical bounds for the hitbox and crack effect', () => {
    const { meleeRange: length } = WEAPONS.warhammer;
    const { halfWidth } = WARHAMMER_GROUND_SLAM;
    expect(length).toBe(260);
    expect(halfWidth).toBe(85);
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, 259, 84, length, halfWidth)).toBe(true);
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, 261, 0, length, halfWidth)).toBe(false);
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, 90, 86, length, halfWidth)).toBe(false);
    expect(inForwardRectangle(0, 0, { x: 1, y: 0 }, -5, 0, length, halfWidth)).toBe(false);
    expect(inForwardRectangle(100, 100, { x: 0, y: -1 }, 40, -150, length, halfWidth)).toBe(true);
    expect(inForwardRectangle(100, 100, { x: 0, y: -1 }, 0, -150, length, halfWidth)).toBe(false);
  });

  it('slows down living targets for several seconds without permanently affecting their speed', () => {
    expect(WARHAMMER_GROUND_SLAM.slowFactor).toBeGreaterThan(0);
    expect(WARHAMMER_GROUND_SLAM.slowFactor).toBeLessThan(0.5);
    expect(WARHAMMER_GROUND_SLAM.slowDurationMs).toBeGreaterThanOrEqual(2000);
    expect(WARHAMMER_GROUND_SLAM.crackAnimationMs).toBeGreaterThan(300);
    expect(getWeaponStats('warhammer', 5).damage).toBeGreaterThan(WEAPONS.warhammer.damage);
  });
});

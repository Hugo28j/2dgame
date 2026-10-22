import { describe, expect, it } from 'vitest';
import { HERO_WEAPONS, WEAPONS } from '../src/weapons/weaponConfig';
import { poseForWeapon, poseLengthMs, attackPoseProgress } from '../src/heroes/characterAttackPose';
import { hasAnimatedHero } from '../src/heroes/heroEquipmentArt';

describe('final three heroes physical weapon animation routing', () => {
  const cases = [
    ['pyromancer', 'emberstaff','ember-staff'],
    ['pyromancer', 'fireorbs','flamethrower'],
    ['stormstrider','lightning','storm-wand'],
    ['stormstrider','stormlance','storm-lance'],
    ['voidwalker','voidorb','abyss-orb'],
    ['voidwalker','shadowscythe','shadow-scythe'],
  ] as const;

  it('maps both equipped weapons of each remaining hero to a unique pose', () => {
    for (const [hero, weapon, pose] of cases) {
      expect(hasAnimatedHero(hero)).toBe(true);
      expect(HERO_WEAPONS[hero]).toContain(weapon);
      expect(WEAPONS[weapon].heroId).toBe(hero);
      expect(poseForWeapon(weapon)).toBe(pose);
    }
    expect(new Set(cases.map(([,,pose]) => pose)).size).toBe(6);
  });

  it('uses a bounded visual animation duration instead of altering fire rates', () => {
    const typicalInterval = 650;
    for(const [,weapon, pose] of cases) {
      const duration = poseLengthMs(pose,typicalInterval);
      expect(duration).toBeGreaterThanOrEqual(75);
      expect(duration).toBeLessThan(typicalInterval);
      expect(poseLengthMs(pose,130)).toBeLessThanOrEqual(130);
      expect(WEAPONS[weapon].fireRate).toBeGreaterThan(0);
      expect(attackPoseProgress(200,100,duration)).toBeGreaterThanOrEqual(0);
      expect(attackPoseProgress(100+duration,100,duration)).toBe(1);
    }
  });

  it('keeps older hero weapon poses intact', () => {
    expect(poseForWeapon('warhammer')).toBe('hammer');
    expect(poseForWeapon('bow')).toBe('bow');
    expect(poseForWeapon('iceblade')).toBe('ice-wave');
    expect(poseForWeapon('staff')).toBe('staff');
  });
});

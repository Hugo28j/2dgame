import { describe, expect, it } from 'vitest';
import { poseForWeapon, poseLengthMs } from '../src/heroes/characterAttackPose';
import {
  RUNE_TOME, runeAimTarget, runeBounceTarget, runeAngleDifference,
  runeRicochetHeading, runeSteer,
} from '../src/weapons/runeTome';

describe('Mage/Frostblade physical attack poses', () => {
  it('assigns different hand gestures for all four new weapon attacks', () => {
    expect(poseForWeapon('staff')).toBe('staff');
    expect(poseForWeapon('spellbook')).toBe('spellbook');
    expect(poseForWeapon('daggers')).toBe('ice-dagger');
    expect(poseForWeapon('iceblade')).toBe('ice-wave');
    expect(poseForWeapon('warhammer')).toBe('hammer');
    expect(poseForWeapon('bow')).toBe('bow');
  });
  it('scales visible casting animation to the attack interval', () => {
    expect(poseLengthMs('ice-dagger', 130)).toBeLessThan(130);
    expect(poseLengthMs('staff', 500)).toBeGreaterThan(poseLengthMs('ice-dagger', 500));
    expect(poseLengthMs('ice-wave', 650)).toBeGreaterThan(poseLengthMs('staff', 650));
  });
});

describe('Rune Tome sharper ricochet and modest attraction', () => {
  it('aims slightly further from the firing direction but clamps tracking', () => {
    const about23Degrees = 23 * Math.PI / 180;
    const about27Degrees = 27 * Math.PI / 180;
    const enemies = [
      { enemyId: 'closer', x: 160 * Math.cos(about23Degrees), y: 160 * Math.sin(about23Degrees) },
    ];
    expect(runeAimTarget({x:0,y:0}, 0, enemies)?.enemyId).toBe('closer');
    expect(runeAimTarget({x:0,y:0}, 0,
      [{enemyId:'off',x:160*Math.cos(about27Degrees),y:160*Math.sin(about27Degrees)}]))
      .toBeUndefined();
    expect(RUNE_TOME.initialAssistRadius).toBe(350);
    expect(RUNE_TOME.initialTurnRadiansPerSecond).toBeGreaterThan(1.15);
    const turned = runeSteer(0, Math.PI / 2, 1 / 60,
      RUNE_TOME.initialTurnRadiansPerSecond, 0);
    expect(turned).toBeGreaterThan(0);
    expect(turned).toBeLessThan(RUNE_TOME.maxAimDeviation);
  });

  it('turns sharply toward a different enemy at first impact instead of continuing straight', () => {
    const first = {enemyId:'first', x:100,y:0};
    const second = {enemyId:'second', x:100,y:120};
    const third = {enemyId:'outside',x:1000,y:0};
    const selected = runeBounceTarget(first, first.enemyId, [first,second,third]);
    expect(selected?.enemyId).toBe('second');
    const newHeading = runeRicochetHeading(first, selected!);
    expect(runeAngleDifference(0, newHeading)).toBeCloseTo(Math.PI / 2);
    expect(runeRicochetHeading(first, {x:10,y:0})).toBeCloseTo(Math.PI);
    expect(runeBounceTarget(first,'first',[first,third])).toBeUndefined();
  });

  it('never chooses the hit enemy again as the second victim', () => {
    const primary = {enemyId:'A',x:0,y:0};
    const target = runeBounceTarget(primary,'A',[
      primary, {enemyId:'B',x:80,y:30}, {enemyId:'C',x:200,y:0},
    ]);
    expect(target?.enemyId).toBe('B');
  });
});

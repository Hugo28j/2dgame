import { describe, expect, it } from 'vitest';
import { poseLengthMs } from '../src/heroes/characterAttackPose';
import { bowArrowIsHeld, bowDrawAmount, bowNockProgress, crossbowBoltLoadAmount,
  crossbowCockAmount, crossbowReloadPhase,
  RANGER_WEAPON_ANIMATION } from '../src/heroes/rangerWeaponAnimation';

describe('coherent Ranger weapon animation', () => {
  it('nocks and fully draws the Ascent Bow before its release frame', () => {
    expect(bowNockProgress(0)).toBe(0);
    expect(bowNockProgress(RANGER_WEAPON_ANIMATION.bowNockEnds)).toBe(1);
    expect(bowDrawAmount(.2)).toBeGreaterThan(0);
    expect(bowDrawAmount(.54)).toBeGreaterThan(.9);
    expect(bowArrowIsHeld(.55)).toBe(true);
    expect(bowArrowIsHeld(RANGER_WEAPON_ANIMATION.bowReleaseAt)).toBe(false);
    expect(bowDrawAmount(.8)).toBe(0);
  });

  it('shows recoil, string cocking, bolt insertion and a settled crossbow in order', () => {
    expect(crossbowReloadPhase(.05)).toBe('release');
    expect(crossbowReloadPhase(.3)).toBe('cock');
    expect(crossbowReloadPhase(.7)).toBe('load');
    expect(crossbowReloadPhase(.95)).toBe('settle');
    expect(crossbowCockAmount(.14)).toBe(0);
    expect(crossbowCockAmount(.54)).toBe(1);
    expect(crossbowBoltLoadAmount(.54)).toBe(0);
    expect(crossbowBoltLoadAmount(.84)).toBe(1);
  });

  it('scales both animations to real fire rate while keeping reload readable', () => {
    expect(poseLengthMs('bow',250)).toBe(220);
    expect(poseLengthMs('bow',100)).toBe(90);
    expect(poseLengthMs('crossbow',600)).toBe(540);
    expect(poseLengthMs('crossbow',250)).toBe(225);
  });
});

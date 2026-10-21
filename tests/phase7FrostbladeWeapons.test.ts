import { describe, expect, it } from 'vitest';
import {
  GLACIAL_COMBO, glacialStrikeDelayMs, glacialStrikeHits, glacialStrikeShape,
  nextGlacialStrike, type GlacialStrike,
} from '../src/weapons/glacialCombo';
import { ICE_SPIKE, iceSpikeCollisionSize } from '../src/weapons/iceSpike';
import { WEAPONS, getWeaponStats } from '../src/weapons/weaponConfig';

describe('Phase 7 Glacial Blade three-stage combo', () => {
  it('executes exactly slash, opposite slash, thrust and loops', () => {
    let strike: GlacialStrike = 0;
    const sequence: number[] = [];
    for (let i=0;i<7;i++) {
      sequence.push(strike);
      strike = nextGlacialStrike(strike);
    }
    expect(sequence).toEqual([0,1,2,0,1,2,0]);
    expect(glacialStrikeShape(0,72).kind).toBe('slash');
    expect(glacialStrikeShape(1,72).kind).toBe('slash');
    expect(glacialStrikeShape(2,72).kind).toBe('thrust');
  });
  it('third thrust has substantially more forward reach and less sideways width', () => {
    const first=glacialStrikeShape(0,72);
    const second=glacialStrikeShape(1,72);
    const third=glacialStrikeShape(2,72);
    expect(first.reach).toBeGreaterThan(72);
    expect(second.reach).toBeGreaterThan(72);
    expect(third.reach).toBeGreaterThan(second.reach * 1.8);
    expect(third.halfWidth).toBeLessThan(20);
    const owner={x:0,y:0},aim={x:1,y:0};
    expect(glacialStrikeHits(0,owner,aim,{x:50,y:0},72,0)).toBe(true);
    expect(glacialStrikeHits(0,owner,aim,{x:82,y:0},72,0)).toBe(true);
    expect(glacialStrikeHits(1,owner,aim,{x:91,y:0},72,0)).toBe(true);
    expect(glacialStrikeHits(2,owner,aim,{x:165,y:0},72,0)).toBe(true);
    expect(glacialStrikeHits(1,owner,aim,{x:50,y:0},72,0)).toBe(true);
    expect(glacialStrikeHits(0,owner,aim,{x:112,y:0},72,0)).toBe(false);
    expect(glacialStrikeHits(1,owner,aim,{x:112,y:0},72,0)).toBe(false);
    expect(glacialStrikeHits(2,owner,aim,{x:112,y:0},72,0)).toBe(true);
    expect(glacialStrikeHits(2,owner,aim,{x:55,y:22},72,0)).toBe(false);
    expect(glacialStrikeHits(2,owner,aim,{x:-9,y:0},72,0)).toBe(false);
    expect(glacialStrikeHits(2,owner,aim,{x:155,y:0},72,0.2)).toBe(true);
  });
  it('has a longer recovery after stab, scaled by speed upgrades', () => {
    const rate=getWeaponStats('iceblade',1).fireRate;
    expect(GLACIAL_COMBO.recoveryAnimationMs).toBeGreaterThan(GLACIAL_COMBO.slashAnimationMs);
    expect(glacialStrikeDelayMs(2,rate)).toBeGreaterThan(glacialStrikeDelayMs(1,rate)*2);
    expect(glacialStrikeDelayMs(0,rate*1.5)).toBeLessThan(glacialStrikeDelayMs(0,rate));
    expect(glacialStrikeDelayMs(2,rate*1.5)).toBeLessThan(glacialStrikeDelayMs(2,rate));
  });
  it('does not change other weapons or Frostblade Ice Dagger balance', () => {
    expect(WEAPONS.iceblade.attackMode).toBe('melee');
    expect(WEAPONS.daggers.damage).toBe(14);
    expect(WEAPONS.daggers.fireRate).toBe(5.1);
    expect(WEAPONS.daggers.projectileSpeed).toBe(550);
    expect(WEAPONS.daggers.projectileCount).toBe(2);
    expect(WEAPONS.daggers.projectileRange).toBe(365);
    expect(WEAPONS.iceblade.meleeRange).toBe(72);
    expect(WEAPONS.sunblade.fireRate).toBe(1.75);
  });
});

describe('Phase 7 Ice Daggers sharp crystal form and collider', () => {
  it('uses an elongated narrow core, without a huge invisible body', () => {
    expect(ICE_SPIKE.textureWidth).toBeGreaterThan(ICE_SPIKE.textureHeight*2);
    expect(ICE_SPIKE.coreLength).toBeLessThan(ICE_SPIKE.textureWidth);
    expect(ICE_SPIKE.coreThickness).toBeLessThan(ICE_SPIKE.textureHeight/2);
    expect(iceSpikeCollisionSize(0)).toEqual({width:29,height:7});
    expect(iceSpikeCollisionSize(Math.PI/2)).toEqual({width:7,height:29});
    const diagonal=iceSpikeCollisionSize(Math.PI/4);
    expect(diagonal.width).toBeLessThan(29);
    expect(diagonal.height).toBeLessThan(29);
    expect(diagonal.width).toBeGreaterThan(20);
  });
  it('keeps each projectile trail brief and capped for mobile performance', () => {
    expect(ICE_SPIKE.maxTrailSamples).toBeLessThanOrEqual(6);
    expect(ICE_SPIKE.trailLifetimeMs).toBeLessThanOrEqual(250);
  });
});

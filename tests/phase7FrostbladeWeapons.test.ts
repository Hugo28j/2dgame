import { describe, expect, it } from 'vitest';
import { BIG_WAVE, bigWaveHitKind } from '../src/weapons/elementalMelee';
import { ICE_SPIKE, iceSpikeCollisionSize } from '../src/weapons/iceSpike';
import { HEROES } from '../src/heroes/heroConfig';
import { WEAPONS, getWeaponStats, weaponBaseAttackIntervalMs } from '../src/weapons/weaponConfig';

describe('Frostblade Big Wave replaces the old three-strike sword', () => {
  it('uses a short travelling melee wave, with splash edges and knockback', () => {
    const wave = WEAPONS.iceblade;
    expect(wave.name).toBe('Big Wave');
    expect(wave.attackMode).toBe('melee');
    expect(wave.meleeRange).toBe(130);
    expect(wave.specialEffects).toContain('splash');
    expect(wave.specialEffects).toContain('knockback');
    expect(BIG_WAVE.durationMs).toBeGreaterThan(200);
    const owner={x:0,y:0},direction={x:1,y:0};
    expect(bigWaveHitKind(owner,direction,{x:65,y:20},60,130)).toBe('direct');
    expect(bigWaveHitKind(owner,direction,{x:100,y:92},130,130)).toBe('splash');
    expect(bigWaveHitKind(owner,direction,{x:100,y:125},130,130)).toBeNull();
    expect(bigWaveHitKind(owner,direction,{x:110,y:0},50,130)).toBeNull();
    expect(bigWaveHitKind(owner,direction,{x:185,y:0},130,130)).toBeNull();
    expect(bigWaveHitKind(owner,direction,{x:-35,y:0},130,130)).toBeNull();
    expect(bigWaveHitKind(owner,{x:0,y:1},{x:18,y:90},130,130)).toBe('direct');
  });
  it('scales weapon damage from 30 to 120 and real attack speed from 0.7 to 1.3 per second', () => {
    const initial=getWeaponStats('iceblade',1),max=getWeaponStats('iceblade',30);
    expect(initial.damage).toBe(30);
    expect(max.damage).toBe(120);
    expect(1000/weaponBaseAttackIntervalMs(initial)).toBeCloseTo(.7,8);
    expect(1000/weaponBaseAttackIntervalMs(max)).toBeCloseTo(1.3,8);
    expect(initial.fireRate*HEROES.frostblade.stats.attackSpeed).toBeCloseTo(.7,8);
    expect(getWeaponStats('iceblade',20).damage).toBeGreaterThan(30);
    expect(getWeaponStats('iceblade',20).damage).toBeLessThan(120);
  });
  it('preserves the separate Ice Daggers', () => {
    expect(WEAPONS.daggers.damage).toBe(14);
    expect(WEAPONS.daggers.fireRate).toBe(5.1);
    expect(WEAPONS.daggers.projectileSpeed).toBe(550);
    expect(WEAPONS.daggers.projectileCount).toBe(2);
    expect(WEAPONS.daggers.projectileRange).toBe(365);
  });
});

describe('Ice Daggers crystal form and collider', () => {
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

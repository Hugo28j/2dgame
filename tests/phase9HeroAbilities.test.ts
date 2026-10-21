import {describe,expect,it} from 'vitest';
import { ABILITIES, getAbilityStats, HERO_ABILITIES, isAimedAbility } from '../src/abilities/abilityConfig';
import { FROST_TIMEWARP, SHOTGUN_TRANSFORM, WHITEOUT_WAVE,
  frostSlowMotionCooldownMs, frostSlowMotionDurationMs,
  shotgunVolleyAngles, whiteoutWaveRadius, whiteoutReaches } from '../src/abilities/phase9Balance';
import { WEAPONS } from '../src/weapons/weaponConfig';
import { defaultProfile, validateProfile } from '../src/progression/ProgressStore';

describe('Phase 9 — Guardian gravity grip',()=>{
  it('changes only its base cooldown to 5 seconds',()=>{
    const g=getAbilityStats('guardian-slam',1);
    expect(g.cooldownMs).toBe(5000);
    expect(g.radius).toBe(225);
    expect(g.damage).toBe(37);
    expect(g.durationMs).toBe(320);
    expect(g.kind).toBe('wind');
    expect(getAbilityStats('guardian-slam',20).cooldownMs).toBeLessThan(5000);
    expect(ABILITIES['guardian-charge'].cooldownMs).toBe(30000);
  });
});
describe('Phase 9 — Ranger eight-second shotgun',()=>{
  it('equips a temporary seven-arrow mode rather than a directed one-shot ability',()=>{
    const a=getAbilityStats('ranger-rain',1);
    expect(a.name).toBe('Shotgun Volley');
    expect(a.kind).toBe('shotgun');
    expect(a.cooldownMs).toBe(35000);
    expect(a.durationMs).toBe(8000);
    expect(SHOTGUN_TRANSFORM.cadenceMs).toBe(1200);
    expect(SHOTGUN_TRANSFORM.arrowsPerVolley).toBe(7);
    expect(isAimedAbility(a.kind)).toBe(false); // one tap enables the buff
    expect(Math.ceil(a.durationMs/SHOTGUN_TRANSFORM.cadenceMs)).toBe(7);
    expect(HERO_ABILITIES.ranger[1]).toBe('ranger-rain');
  });
  it('emits precisely seven directed and symmetrical projectile angles',()=>{
    for(const aim of [0,Math.PI/3,-Math.PI/2]){
      const angles=shotgunVolleyAngles(aim);
      expect(angles).toHaveLength(7);
      expect(angles[3]).toBeCloseTo(aim);
      expect(angles[0]!+angles[6]!).toBeCloseTo(2*aim);
      for(let i=1;i<7;i++)
        expect(angles[i]!-angles[i-1]!).toBeCloseTo(SHOTGUN_TRANSFORM.spreadRadians);
    }
  });
  it('does not change Ranger equipped weapon IDs or save inventory',()=>{
    expect(WEAPONS.bow.id).toBe('bow');
    expect(WEAPONS.crossbow.id).toBe('crossbow');
    const p=defaultProfile();
    const rangerProfile=validateProfile({...p,selectedHero:'ranger',
      selectedWeapon:'crossbow',selectedWeapons:{...p.selectedWeapons,ranger:'crossbow'},
      unlockedWeapons:[...p.unlockedWeapons,'crossbow']});
    expect(rangerProfile.selectedWeapon).toBe('crossbow');
  });
});
describe('Phase 9 — Frostblade 50% global slow motion',()=>{
  it('starts at exactly 5sec and 30sec cooldown and ends at 10sec / 25sec',()=>{
    expect(ABILITIES['frost-ring'].kind).toBe('timewarp');
    expect(getAbilityStats('frost-ring',1).name).toBe('Slow Motion');
    expect(getAbilityStats('frost-ring',1).damage).toBe(0);
    expect(getAbilityStats('frost-ring',1).durationMs).toBe(5000);
    expect(getAbilityStats('frost-ring',1).cooldownMs).toBe(30000);
    expect(getAbilityStats('frost-ring',20).durationMs).toBe(10000);
    expect(getAbilityStats('frost-ring',20).cooldownMs).toBe(25000);
    expect(FROST_TIMEWARP.enemyFactor).toBe(.5);
    expect(FROST_TIMEWARP.projectileFactor).toBe(.5);
  });
  it('scales monotonically every level with no rounding drift at endpoints',()=>{
    let lastDuration=0,lastCooldown=Infinity;
    for(let level=1;level<=20;level++){
      const a=getAbilityStats('frost-ring',level);
      expect(a.durationMs).toBe(frostSlowMotionDurationMs(level));
      expect(a.cooldownMs).toBe(frostSlowMotionCooldownMs(level));
      expect(a.durationMs).toBeGreaterThan(lastDuration);
      expect(a.cooldownMs).toBeLessThan(lastCooldown);
      lastDuration=a.durationMs;lastCooldown=a.cooldownMs;
    }
    expect(frostSlowMotionDurationMs(900)).toBe(10000);
    expect(frostSlowMotionCooldownMs(0)).toBe(30000);
    expect(ABILITIES['mage-timewarp'].slowFactor).toBe(.28);
  });
});
describe('Phase 9 — Whiteout frost dust',()=>{
  it('is a damaging knockback wave with stated level-1 balance',()=>{
    const a=getAbilityStats('frost-blizzard',1);
    expect(a.name).toBe('Whiteout');
    expect(a.kind).toBe('area');
    expect(a.radius).toBe(250);
    expect(a.damage).toBe(150);
    expect(a.cooldownMs).toBe(17000);
    expect(WHITEOUT_WAVE.knockbackSpeed).toBeGreaterThan(0);
    expect(WHITEOUT_WAVE.knockbackMs).toBeGreaterThan(0);
  });
  it('has radial hit geometry that follows the visible outward expansion',()=>{
    const center={x:0,y:0};
    expect(whiteoutWaveRadius(0)).toBe(0);
    expect(whiteoutWaveRadius(.5)).toBe(125);
    expect(whiteoutWaveRadius(1)).toBe(250);
    expect(whiteoutWaveRadius(4)).toBe(250);
    expect(whiteoutReaches(center,{x:180,y:0},125,14)).toBe(false);
    expect(whiteoutReaches(center,{x:125,y:0},125,0)).toBe(true);
    expect(whiteoutReaches(center,{x:251,y:0},250,0)).toBe(false);
    expect(whiteoutReaches(center,{x:-30,y:-30},100)).toBe(true);
  });
});

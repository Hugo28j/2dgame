import { describe, expect, it } from 'vitest';
import { RUNE_TOME, runeAimTarget, runeBounceTarget,
  runeSteer, runeAngleDifference } from '../src/weapons/runeTome';
import { WEAPONS, getWeaponStats } from '../src/weapons/weaponConfig';
import { HERO_WEAPONS } from '../src/weapons/weaponConfig';
import { defaultProfile, validateProfile } from '../src/progression/ProgressStore';

describe('Phase 8 — Rune Tome weapon and save compatibility', () => {
  it('renames the old item while preserving its save ID and a single base orb', () => {
    expect(WEAPONS.spellbook.name).toBe('Rune Tome');
    expect(WEAPONS.spellbook.id).toBe('spellbook');
    expect(WEAPONS.spellbook.projectileCount).toBe(1);
    expect(WEAPONS.spellbook.textureKey).toBe('rune-projectile');
    expect(getWeaponStats('spellbook',10).projectileCount).toBe(1);
    expect(HERO_WEAPONS.mage[1]).toBe('spellbook');
    const profile=defaultProfile();
    const migrated=validateProfile({
      ...profile, heroLevels:{...profile.heroLevels,mage:20},
      unlockedHeroes:[...profile.unlockedHeroes,'mage'],
      unlockedWeapons:[...profile.unlockedWeapons,'spellbook'],
      selectedHero:'mage',selectedWeapon:'spellbook',
      selectedWeapons:{...profile.selectedWeapons,mage:'spellbook'},
    });
    expect(migrated.selectedWeapon).toBe('spellbook');
  });
});

describe('Phase 8 — limited aim assist', () => {
  const origin={x:0,y:0};
  it('finds a nearby target only within a shallow forward cone', () => {
    expect(runeAimTarget(origin,0,[
      {enemyId:'behind',x:-40,y:0},
      {enemyId:'off',x:150,y:90},
      {enemyId:'ahead',x:200,y:20},
    ])?.enemyId).toBe('ahead');
    expect(runeAimTarget(origin,0,[{enemyId:'off',x:100,y:130}])).toBeUndefined();
    expect(runeAimTarget(origin,0,[{enemyId:'far',x:800,y:4}])).toBeUndefined();
  });
  it('steers gradually, never snaps, and never turns outside original cone', () => {
    const a=runeSteer(0,.3,0.016,RUNE_TOME.initialTurnRadiansPerSecond,0);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(.04);
    let direction=0;
    for(let i=0;i<80;i++)direction=runeSteer(direction,1.2,.016,
      RUNE_TOME.initialTurnRadiansPerSecond,0);
    expect(direction).toBeCloseTo(RUNE_TOME.maxAimDeviation);
    expect(runeAngleDifference(0,direction)).toBeLessThanOrEqual(RUNE_TOME.maxAimDeviation+1e-8);
    // Only after the first hit may the orb curve sharply to the second enemy.
    const turn=runeSteer(0,Math.PI,.016,RUNE_TOME.bounceTurnRadiansPerSecond);
    expect(Math.abs(turn)).toBeGreaterThan(.1);
    expect(Math.abs(turn)).toBeLessThan(.2);
  });
  it('retains stable steering for differently sized simulation frames', () => {
    let a=0,b=0;
    for(let i=0;i<60;i++)a=runeSteer(a,.3,.016,1.15,0);
    for(let i=0;i<30;i++)b=runeSteer(b,.3,.032,1.15,0);
    expect(a).toBeCloseTo(b,5);
  });
});

describe('Phase 8 — one ricochet target only', () => {
  it('selects a different nearby enemy, excluding the first and distant enemies', () => {
    const origin={x:50,y:50};
    expect(runeBounceTarget(origin,'first',[
      {enemyId:'first',x:52,y:50},
      {enemyId:'far',x:500,y:500},
      {enemyId:'second',x:190,y:90},
    ])?.enemyId).toBe('second');
    expect(runeBounceTarget(origin,'first',[
      {enemyId:'first',x:50,y:51},
      {enemyId:'far',x:800,y:0},
    ])).toBeUndefined();
    expect(RUNE_TOME.bounceMaxDurationMs).toBeLessThan(1000);
    expect(RUNE_TOME.maxTrailSamples).toBeLessThanOrEqual(10);
  });
});

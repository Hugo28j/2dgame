import { describe, expect, it } from 'vitest';
import { ENEMY_UNLOCK_ROOMS, getEnemyKindForRoom, getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { CHARGER_DASH, WORLD1_BEETLE_DASH } from '../src/enemies/enemyBalance';
import { WEAPONS, getWeaponStats } from '../src/weapons/weaponConfig';
import { getAbilityStats } from '../src/abilities/abilityConfig';

describe('World 1 mob rebalance and replacement spawns', () => {
  it('introduces the Beetle, Treant, Wisp and Sporecap at their new rooms', () => {
    expect(ENEMY_UNLOCK_ROOMS.charger).toBe(11);
    expect(ENEMY_UNLOCK_ROOMS.tank).toBe(16);
    expect(ENEMY_UNLOCK_ROOMS.mage).toBe(21);
    expect(ENEMY_UNLOCK_ROOMS.bomber).toBe(26);
    for (const [kind, room] of [['charger',11],['tank',16],['mage',21],['bomber',26]] as const)
      expect(getEnemyKindForRoom(room, 0, 1)).toBe(kind);
  });
  it('retires Briar Hunters at 21 and Mosslings at 26 across all spawn indices', () => {
    for (let room=21;room<=30;room++) {
      if (room%5===0) continue;
      for (let i=0;i<100;i++) {
        expect(getEnemyKindForRoom(room,i,1)).not.toBe('archer');
        if (room>=26) expect(getEnemyKindForRoom(room,i,1)).not.toBe('slime');
      }
    }
    expect(Array.from({length:80},(_,i)=>getEnemyKindForRoom(24,i,1)).filter(x=>x==='mage').length).toBeGreaterThan(20);
    expect(Array.from({length:80},(_,i)=>getEnemyKindForRoom(28,i,1)).filter(x=>x==='bomber').length).toBeGreaterThan(20);
  });
  it('buffs Mossling, Briar and Willow but keeps Frozen Hollow untouched', () => {
    expect(getEnemyStatsForRoom('slime',1,1).movementSpeed).toBe(175);
    expect(getEnemyStatsForRoom('archer',1,1).damage).toBe(18);
    expect(getEnemyStatsForRoom('mage',21,1).maxHp).toBe(Math.round(68*6*(1+20*.08)));
    expect(getEnemyStatsForRoom('mage',21,1).attackIntervalMs).toBe(Math.round(1950/1.2));
    expect(getEnemyStatsForRoom('mage',21,2).attackIntervalMs).toBe(Math.round(1950/1.05));
  });
  it('triples Sporecap speed and halves HP', () => {
    expect(getEnemyStatsForRoom('bomber',26,1).movementSpeed).toBe(300);
    expect(getEnemyStatsForRoom('bomber',26,1).maxHp).toBe(Math.round(75*.5*(1+25*.08)));
    expect(getEnemyStatsForRoom('bomber',26,2).movementSpeed).toBe(104);
  });
  it('doubles Beetle dash velocity and extends its range 50%', () => {
    expect(WORLD1_BEETLE_DASH.speedMultiplier).toBe(2);
    expect(WORLD1_BEETLE_DASH.speedMultiplier*WORLD1_BEETLE_DASH.durationMultiplier).toBe(1.5);
    expect(CHARGER_DASH.distance*1.5).toBeGreaterThan(CHARGER_DASH.distance);
  });
});
describe('Ranger initial balance and Windstep upgrades', () => {
  it('halves starting bow damage and keeps upgrades consistent', () => {
    expect(WEAPONS.bow.damage).toBe(12);
    expect(getWeaponStats('bow',1).damage).toBe(12);
    expect(getWeaponStats('bow',2).damage).toBeGreaterThan(12);
    expect(WEAPONS.crossbow.damage).toBe(46);
  });
  it('increases dash distance while reducing cooldown with each level', () => {
    for(let i=1;i<20;i++){
      const before=getAbilityStats('ranger-step',i);
      const after=getAbilityStats('ranger-step',i+1);
      expect(after.dashSpeed).toBeGreaterThan(before.dashSpeed);
      expect(after.cooldownMs).toBeLessThan(before.cooldownMs);
    }
  });
});

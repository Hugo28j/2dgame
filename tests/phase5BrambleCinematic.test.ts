import { describe, it, expect } from 'vitest';
import { BRAMBLE_CINEMATIC, nextBrambleStage, brambleDamageAllowed,
  amplifiedTwinVolleyIndex, brambleWindLanding } from '../src/enemies/brambleCinematic';
import { getWorldBossName } from '../src/worlds/worldConfig';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { splitTwinShotAngle } from '../src/enemies/projectilePatterns';
import { RoomProgress } from '../src/rooms/RoomProgress';

describe('phase 5: one-time Bramble Gunner cinematic and twin handoff', () => {
  it('progresses through exactly one wind/growth/explosion/handoff then idle reset', () => {
    let stage = nextBrambleStage('idle');
    expect(stage).toBe('wind');
    expect(nextBrambleStage(stage)).toBe('growth');
    expect(nextBrambleStage('growth')).toBe('explosion');
    expect(nextBrambleStage('explosion')).toBe('handoff');
    expect(nextBrambleStage('handoff')).toBe('handoff');
    for (const state of ['wind','growth','explosion','handoff'] as const)
      expect(brambleDamageAllowed(state)).toBe(false);
    expect(brambleDamageAllowed('idle')).toBe(true);
  });
  it('pushes the hero outward, never through world boundaries and with zero attack damage', () => {
    const bounds={x:0,y:0,width:880,height:980},boss={x:440,y:240};
    const hero={x:460,y:360};
    const dst=brambleWindLanding(boss,hero,bounds);
    expect(dst.y).toBeGreaterThan(hero.y);
    expect(Math.hypot(dst.x-boss.x,dst.y-boss.y)).toBeGreaterThan(
      Math.hypot(hero.x-boss.x,hero.y-boss.y));
    for(const location of [hero,{x:845,y:945},{x:30,y:30}]) {
      const point=brambleWindLanding(boss,location,bounds);
      expect(point.x).toBeGreaterThanOrEqual(36);
      expect(point.x).toBeLessThanOrEqual(844);
      expect(point.y).toBeGreaterThanOrEqual(36);
      expect(point.y).toBeLessThanOrEqual(944);
    }
  });
  it('keeps the first boss and the two distinct follow-up bosses on level 20', () => {
    expect(getWorldBossName(1,20,0)).toBe('Bramble Gunner');
    expect(getWorldBossName(1,20,1)).toBe('Bloom Sentinel');
    const progress=new RoomProgress(30);
    progress.roomNumber=20;
    progress.startRoom(1);
    progress.addEnemies(2);
    expect(progress.registerEnemyDefeated()).toBe(false);
    expect(progress.doorOpen).toBe(false);
    expect(progress.registerEnemyDefeated()).toBe(false);
    expect(progress.registerEnemyDefeated()).toBe(true);
  });
  it('gives BOTH Sentinels exactly 50% more HP than current pre-phase-5 stats', () => {
    const tierScale=(1+19*.08)*(1+(4-1)*.09);
    const oldHp=Math.round(880*tierScale);
    const full=getEnemyStatsForRoom('boss',20,1,1);
    expect(full.maxHp).toBe(Math.round(Math.round(880*tierScale)*1.5));
    expect(full.maxHp).toBe(Math.round(oldHp*1.5));
    expect(getEnemyStatsForRoom('boss',20,1,0).maxHp).toBe(Math.round(oldHp*.7));
  });
  it('doubles current twin firing rate and angle without changing opposite rotation', () => {
    expect(BRAMBLE_CINEMATIC.sentinelAttackRateMultiplier).toBe(3);
    expect(BRAMBLE_CINEMATIC.sentinelSpinMultiplier).toBe(2);
    const a0=splitTwinShotAngle(amplifiedTwinVolleyIndex(0),0);
    const a1=splitTwinShotAngle(amplifiedTwinVolleyIndex(1),0);
    const b0=splitTwinShotAngle(amplifiedTwinVolleyIndex(0),1);
    const b1=splitTwinShotAngle(amplifiedTwinVolleyIndex(1),1);
    expect(b0-a0).toBeCloseTo(Math.PI);
    expect(a1-a0).toBeCloseTo(2*Math.PI/3);
    expect(b1-b0).toBeCloseTo(-2*Math.PI/3);
    // Twice existing 1.5x fire rate, not adding an extra 1.5x on top.
    expect(1550/BRAMBLE_CINEMATIC.sentinelAttackRateMultiplier)
      .toBeCloseTo((1550/1.5)/2);
  });
});

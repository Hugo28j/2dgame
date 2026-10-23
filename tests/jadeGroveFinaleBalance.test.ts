import {describe,it,expect} from 'vitest';
import {getEnemyStatsForRoom} from '../src/enemies/enemyConfig';
import {JADE_BRANCH,selectJadeLane,jadeLaneOverlaps} from '../src/enemies/groveAttacks';

describe('Verdant Ruins finale balance',()=>{
  it('gives only world-one room-30 boss 50% additional health and defense',()=>{
    const room30=getEnemyStatsForRoom('boss',30,1);
    const oldBase=Math.round(880*(1+29*.08)*(1+(6-1)*.09)*2);
    expect(room30.maxHp).toBe(Math.round(oldBase*1.5));
    expect(room30.defense).toBe(36);
    expect(getEnemyStatsForRoom('boss',30,2).defense).toBe(24);
    expect(getEnemyStatsForRoom('boss',25,1).defense).toBe(24);
  });
  it('runs Jade casts 50 percent more often and allows alternating axes',()=>{
    expect(JADE_BRANCH.intervalMs).toBe(667);
    expect(JADE_BRANCH.phaseTwoIntervalMs).toBe(400);
    const bounds={x:0,y:0,width:1100,height:900};
    const first=selectJadeLane(bounds,'horizontal',[],()=>.1)!;
    const second=selectJadeLane(bounds,'vertical',[first],()=>.5)!;
    expect(first.orientation).toBe('horizontal');
    expect(second.orientation).toBe('vertical');
    expect(jadeLaneOverlaps(first,second)).toBe(false);
  });
});

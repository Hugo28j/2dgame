import {describe,it,expect} from 'vitest';
import {jadeLaneOverlaps,selectJadeLane} from '../src/enemies/groveAttacks';
import {getBossPlan} from '../src/enemies/bossProfiles';

const bounds={x:0,y:0,width:980,height:810};
describe('world one boss rework',()=>{
  it('Jade lanes are bounded and leave room for perpendicular attacks',()=>{
    let seed=38; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(const axis of ['horizontal','vertical'] as const){
      const lane=selectJadeLane(bounds,axis,[],random)!;
      expect(lane).toBeDefined();
      if(axis==='horizontal'){
        expect(Math.min(lane.start.x,lane.end.x)).toBeGreaterThan(bounds.x);
        expect(Math.abs(lane.start.x-lane.end.x)).toBeLessThan(bounds.width/2);
        expect(Math.max(lane.start.x,lane.end.x)).toBeLessThan(bounds.x+bounds.width);
      }else{
        expect(Math.min(lane.start.y,lane.end.y)).toBeGreaterThan(bounds.y);
        expect(Math.abs(lane.start.y-lane.end.y)).toBeLessThan(bounds.height/2);
        expect(Math.max(lane.start.y,lane.end.y)).toBeLessThan(bounds.y+bounds.height);
      }
    }
  });
  it('never overlays active warnings or perpendicular corridors',()=>{
    const horizontal=selectJadeLane(bounds,'horizontal',[],()=>.25)!;
    const vertical=selectJadeLane(bounds,'vertical',[],()=>.25)!;
    const beside=selectJadeLane(bounds,'vertical',[horizontal],()=>.3);
    expect(beside).toBeDefined();
    expect(jadeLaneOverlaps(horizontal,beside!)).toBe(false);
  });
  it('keeps the room twenty boss gunner attack plan intact',()=>{
    expect(getBossPlan(20,1,0,0,1).pattern).toBe('machinegun');
  });
});

import { describe, expect, it } from 'vitest';
import { JADE_BRANCH, HEART_TREE, jadeBranchLanes, groveBranchTip,
  groveBranchHits, groveTreeHits } from '../src/enemies/groveAttacks';
import { poisonZonesOverlap, selectPoisonLocations } from '../src/enemies/poisonPlacement';
import { getRoomDefinition } from '../src/rooms/roomConfig';
import { getBossPlan, getBossProfile } from '../src/enemies/bossProfiles';
import { getWorldBossName } from '../src/worlds/worldConfig';

const bounds = getRoomDefinition(25, 1).layout.bounds;
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state,1664525)+1013904223)>>>0;
    return state / 4294967296; };
}
describe('Phase 6: Jade Matriarch growing branches', () => {
  it('preserves the old projectile patterns and adds an independent attack', () => {
    expect(getWorldBossName(1,25)).toBe('Jade Matriarch');
    expect(getBossProfile(25,0,1).phaseOne.patterns).toEqual(['ring']);
    expect(getBossProfile(25,0,1).phaseTwo.patterns).toEqual(['offset-ring','cross']);
    expect(getBossPlan(25,2,1,0,1).pattern).toBe('cross');
    expect(JADE_BRANCH.intervalMs).toBe(800);
    expect(JADE_BRANCH.phaseTwoIntervalMs).toBe(600);
    expect(JADE_BRANCH.warningMs).toBe(600);
    expect(JADE_BRANCH.phaseTwoWarningMs).toBe(400);
    expect(JADE_BRANCH.activeMs).toBe(5000);
    expect(JADE_BRANCH.growthMs).toBeGreaterThan(350);
  });
  it('chooses precisely two well-spaced full-arena lanes for different random seeds', () => {
    const orientations = new Set<string>();
    for (let seed=1;seed<=20;seed++) {
      const lanes=jadeBranchLanes(bounds,rng(seed*12345));
      expect(lanes).toHaveLength(2);
      expect(lanes[0]!.orientation).toBe(lanes[1]!.orientation);
      orientations.add(lanes[0]!.orientation);
      const first=lanes[0]!,second=lanes[1]!;
      const horizontal=first.orientation==='horizontal';
      const near=horizontal ? bounds.x+20 : bounds.y+20;
      const far=horizontal ? bounds.x+bounds.width-20 : bounds.y+bounds.height-20;
      for(const lane of lanes) {
        const from=horizontal?lane.start.x:lane.start.y;
        const to=horizontal?lane.end.x:lane.end.y;
        expect([near,far]).toContain(from);
        expect([near,far]).toContain(to);
        expect(to).not.toBe(from);
      }
      const separation=Math.abs(horizontal ?
        first.start.y-second.start.y : first.start.x-second.start.x);
      expect(separation).toBeGreaterThan((horizontal?bounds.height:bounds.width)*.26);
    }
    expect(orientations.size).toBe(2);
    expect(jadeBranchLanes(bounds, rng(2), 'horizontal')[0]!.orientation).toBe('horizontal');
    expect(jadeBranchLanes(bounds, rng(2), 'vertical')[0]!.orientation).toBe('vertical');
  });
  it('grows from one end and never damages unseen sections', () => {
    const lane=jadeBranchLanes(bounds,rng(22))[0]!;
    expect(groveBranchTip(lane,-1)).toEqual(lane.start);
    expect(groveBranchTip(lane,2)).toEqual(lane.end);
    const early=groveBranchTip(lane,.1);
    const tooFar=groveBranchTip(lane,.9);
    expect(groveBranchHits(lane,.12,early)).toBe(true);
    expect(groveBranchHits(lane,.12,tooFar)).toBe(false);
    expect(groveBranchHits(lane,1,tooFar)).toBe(true);
    const farAway={x:lane.end.x+300,y:lane.end.y+300};
    expect(groveBranchHits(lane,1,farAway)).toBe(false);
  });
});

describe('Phase 6: Heart of the Grove growing trees', () => {
  it('replaces only world-one final boss area art, keeping the existing attack plan', () => {
    expect(getWorldBossName(1,30)).toBe('Heart of the Grove');
    expect(getBossProfile(30,0,1).phaseOne.bombs).toBe(2);
    expect(getBossProfile(30,0,1).phaseTwo.bombs).toBe(4);
    expect(HEART_TREE.warningExtraMs).toBeGreaterThanOrEqual(0);
    expect(HEART_TREE.growthMs).toBeGreaterThan(400);
    expect(HEART_TREE.damageAtProgress).toBeGreaterThan(.5);
    expect(HEART_TREE.fadeMs).toBeGreaterThan(0);
  });
  it('reserves warnings and living trees so no two area attacks overlap', () => {
    const arena=getRoomDefinition(30,1).layout.bounds;
    const radius=58;
    const rand=rng(26);
    let reserved: Array<{x:number;y:number;radius:number}>=[];
    for(let cast=0;cast<16;cast++){
      const fresh=selectPoisonLocations(4,radius,arena,reserved,rand,
        {x:arena.x+arena.width/2,y:arena.y+arena.height/2});
      for(const site of fresh) {
        expect(site.x-site.radius).toBeGreaterThanOrEqual(arena.x);
        expect(site.y-site.radius).toBeGreaterThanOrEqual(arena.y);
        expect(site.x+site.radius).toBeLessThanOrEqual(arena.x+arena.width);
        expect(site.y+site.radius).toBeLessThanOrEqual(arena.y+arena.height);
        expect(reserved.every(other=>!poisonZonesOverlap(site,other))).toBe(true);
        reserved.push(site);
      }
      if(cast%3===2) reserved=reserved.slice(2);
    }
    for(let a=0;a<reserved.length;a++)
      for(let b=a+1;b<reserved.length;b++)
        expect(poisonZonesOverlap(reserved[a]!,reserved[b]!)).toBe(false);
    const cramped=selectPoisonLocations(4,65,
      {x:0,y:0,width:150,height:150},[],rand);
    expect(cramped).toHaveLength(0);
  });
  it('uses the same circle for hitbox and the expanding visible roots', () => {
    const center={x:230,y:420};
    expect(groveTreeHits(center,50,{x:280,y:420})).toBe(true);
    expect(groveTreeHits(center,49,{x:280,y:420})).toBe(false);
    expect(groveTreeHits(center,50,{x:282,y:420})).toBe(false);
    expect(groveTreeHits(center,50,{x:230,y:420})).toBe(true);
  });
});

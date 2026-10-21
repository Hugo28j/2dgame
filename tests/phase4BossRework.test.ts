import { describe, expect, it } from 'vitest';
import { getBossArchetypeIndex, getBossProfile } from '../src/enemies/bossProfiles';
import { getWorldBossName } from '../src/worlds/worldConfig';
import { getWorldCharacter, getWorldBossArtRoster } from '../src/enemies/worldCharacters';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { selectPoisonLocations, poisonZonesOverlap } from '../src/enemies/poisonPlacement';
import { rootWavePoint, rootTipHits } from '../src/enemies/rootGrowth';
import { sporePatrolVelocity } from '../src/enemies/sporeMovement';
import { ROOT_BRANCH, rootBurstAngles, SPORE_THROW_INTERVAL_MS } from '../src/enemies/worldOneBossBalance';
import { SPORE_POISON } from '../src/enemies/poisonHazard';

describe('phase 4 boss encounter migration', () => {
  it('changes names, sprites and attack archetypes together, only for world one', () => {
    expect(getWorldBossName(1, 15)).toBe('Spore Alchemist');
    expect(getWorldBossName(1, 20, 0)).toBe('Bramble Gunner');
    expect(getWorldBossName(1, 20, 1)).toBe('Bloom Sentinel');
    expect(getBossArchetypeIndex(15, 0, 1)).toBe(6);
    expect(getBossArchetypeIndex(20, 0, 1)).toBe(4);
    expect(getBossArchetypeIndex(20, 1, 1)).toBe(3);
    expect(getBossProfile(15, 0, 1).phaseOne.bombs).toBe(3);
    expect(getBossProfile(20, 0, 1).phaseOne.patterns).toContain('machinegun');
    expect(getBossProfile(20, 1, 1).phaseOne.patterns).toContain('spiral');
    expect(getWorldCharacter(1, 'boss', 15).textureKey).toBe('world-1-boss-7');
    expect(getWorldCharacter(1, 'boss', 20, 0).textureKey).toBe('world-1-boss-5');
    expect(getWorldCharacter(1, 'boss', 20, 1).textureKey).toBe('world-1-boss-4');
    const generatedTextures = new Set(getWorldBossArtRoster(1).map(boss => boss.textureKey));
    for (const tier of [1, 3, 4, 5, 7, 8, 10])
      expect(generatedTextures.has('world-1-boss-' + tier)).toBe(true);
    for (const world of [2,3,4,5] as const) {
      expect(getBossArchetypeIndex(15, 0, world)).toBe(4);
      expect(getBossArchetypeIndex(20, 0, world)).toBe(6);
    }
  });
  it('recomputes Spore HP from 15 scaling and its previous 1.5x modifier, plus 50%', () => {
    const scale15 = (1 + 14 * .08) * (1 + (3 - 1) * .09);
    expect(getEnemyStatsForRoom('boss', 15, 1, 0).maxHp)
      .toBe(Math.round(880 * scale15 * 1.5 * 1.5));
    const scale20 = (1 + 19 * .08) * (1 + (4 - 1) * .09);
    expect(getEnemyStatsForRoom('boss', 20, 1, 0).maxHp)
      .toBe(Math.round(880 * scale20 * .7));
    expect(getEnemyStatsForRoom('boss', 20, 1, 1).maxHp)
      .toBe(Math.round(Math.round(880 * scale20) * 1.5));
  });
});
describe('Root Tyrant wave and triple eight-way burst', () => {
  it('has three distinct rotations separated by .8s and a final 3s break', () => {
    for (const rotation of [0,1,2]) {
      const angles = rootBurstAngles(rotation);
      expect(angles).toHaveLength(8);
      expect(angles[0]).toBeCloseTo(rotation * Math.PI / 8);
    }
    expect(ROOT_BRANCH.burstStaggerMs).toBe(800);
    expect(ROOT_BRANCH.pauseAfterBurstMs).toBe(3000);
  });
  it('curves as it grows, and only a sweeping tip can deal damage', () => {
    const a={x:0,y:0}, b={x:400,y:0};
    expect(rootWavePoint(a,b,0)).toEqual(a);
    expect(rootWavePoint(a,b,1).x).toBeCloseTo(400);
    expect(Math.abs(rootWavePoint(a,b,.3).y)).toBeGreaterThan(1);
    expect(rootTipHits({x:200,y:1},{x:205,y:3},{x:204,y:5},12)).toBe(true);
    expect(rootTipHits({x:200,y:1},{x:205,y:3},{x:350,y:0},12)).toBe(false);
  });
});
describe('Spore Alchemist safe poison and arena mobility', () => {
  it('uses normal 1.5s poison and 1s cast frequency', () => {
    expect(SPORE_POISON.durationMs).toBe(1500);
    expect(SPORE_THROW_INTERVAL_MS).toBe(1000);
  });
  it('keeps active and reserved bottle locations separated, even if short on space', () => {
    let n=0;
    const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
    const bounds={x:20,y:30,width:950,height:850};
    const active=[{x:200,y:200,radius:55},{x:600,y:400,radius:55}];
    const first=selectPoisonLocations(12,55,bounds,active,rng,{x:300,y:280});
    const second=selectPoisonLocations(12,55,bounds,[...active,...first],rng);
    const all=[...active,...first,...second];
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)
      expect(poisonZonesOverlap(all[i]!,all[j]!)).toBe(false);
    for(const p of first) {
      expect(p.x-p.radius).toBeGreaterThanOrEqual(bounds.x);
      expect(p.y-p.radius).toBeGreaterThanOrEqual(bounds.y);
      expect(p.x+p.radius).toBeLessThanOrEqual(bounds.x+bounds.width);
      expect(p.y+p.radius).toBeLessThanOrEqual(bounds.y+bounds.height);
    }
    const tiny=selectPoisonLocations(12,60,{x:0,y:0,width:155,height:155},[],rng);
    expect(tiny.length).toBeLessThan(2);
  });
  it('patrols different arena waypoints and keeps its velocity finite', () => {
    const bounds={x:20,y:30,width:1000,height:900};
    const boss={x:400,y:350},hero={x:700,y:650};
    const velocities=[0,1600,3200,4900].map(t=>sporePatrolVelocity(boss,hero,bounds,t,125,1));
    expect(velocities.some(v=>v.x>0)).toBe(true);
    expect(velocities.some(v=>v.x<0)).toBe(true);
    for(const v of velocities)expect(Math.hypot(v.x,v.y)).toBeCloseTo(125);
  });
});

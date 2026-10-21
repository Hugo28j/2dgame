import { describe, expect, it } from 'vitest';
import { BOSS_ROOM_INTERVAL, CHAPTER_ROOM_COUNT, getRoomDefinition,
  getMinimumSpawnDistance, isSpawnSafe } from '../src/rooms/roomConfig';
import { RoomProgress } from '../src/rooms/RoomProgress';
import { spawnWaveSettings, chooseDistantSpawnIndices } from '../src/rooms/spawnWaves';
import { getEnemyKindForRoom, getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { getBossPlan, getBossProfile } from '../src/enemies/bossProfiles';
import { getWorldBossName } from '../src/worlds/worldConfig';
import { selectPoisonLocations, poisonZonesOverlap } from '../src/enemies/poisonPlacement';
import { BRAMBLE_CINEMATIC, nextBrambleStage, brambleDamageAllowed } from '../src/enemies/brambleCinematic';
import { displayedHp } from '../src/ui/displayValues';
import { defaultProfile, validateProfile } from '../src/progression/ProgressStore';

/** A deterministic, engine-independent chamber and state-machine audit.
 * This is NOT equivalent to a visual 60-room browser playthrough.
 */
for (const worldId of [1, 2] as const) {
  describe(`Phase 10 — world ${worldId}, all 30 rooms`, () => {
    for (let room = 1; room <= CHAPTER_ROOM_COUNT; room++) {
      it(`room ${room}: all scheduled spawns fit the arena and can be defeated`, () => {
        const definition = getRoomDefinition(room, worldId);
        expect(definition.number).toBe(room);
        expect(definition.isBossRoom).toBe(room % BOSS_ROOM_INTERVAL === 0);
        expect(definition.enemyCount).toBeGreaterThan(0);
        expect(definition.enemySpawns.length).toBe(definition.enemyCount);
        const { bounds, playerSpawn } = definition.layout;
        for (const point of definition.enemySpawns) {
          expect(point.x).toBeGreaterThan(bounds.x + 20);
          expect(point.x).toBeLessThan(bounds.x + bounds.width - 20);
          expect(point.y).toBeGreaterThan(bounds.y + 20);
          expect(point.y).toBeLessThan(bounds.y + bounds.height - 20);
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
          if (!definition.isBossRoom) {
            expect(isSpawnSafe(point, definition.layout, 140)).toBe(true);
            expect(Math.hypot(point.x-playerSpawn.x,point.y-playerSpawn.y))
              .toBeGreaterThanOrEqual(getMinimumSpawnDistance(room) - 1);
          }
        }
        const indices = definition.enemySpawns.map((_, i) => i);
        const wave = spawnWaveSettings(room, definition.enemyCount);
        expect(wave.initial).toBe(definition.enemyCount);
        expect(wave.maxActive).toBe(definition.enemyCount);
        const chosen = chooseDistantSpawnIndices(
          definition.enemySpawns,indices,playerSpawn,definition.enemyCount,
          wave.preferredDistance);
        expect(new Set(chosen).size).toBe(definition.enemyCount);
        for(const index of chosen) {
          const kind = getEnemyKindForRoom(room,index,worldId);
          const stats=getEnemyStatsForRoom(kind,room,worldId,index);
          expect(stats.maxHp).toBeGreaterThan(0);
          expect(stats.movementSpeed).toBeGreaterThan(0);
          expect(stats.damage).toBeGreaterThanOrEqual(0);
          expect(stats.defense).toBeGreaterThanOrEqual(0);
        }
      });
    }
    it('advances through all 30 rooms without an infinite door or impossible room count', () => {
      const progress = new RoomProgress(CHAPTER_ROOM_COUNT);
      for(let room=1;room<=CHAPTER_ROOM_COUNT;room++) {
        expect(progress.roomNumber).toBe(room);
        const definition=getRoomDefinition(room,worldId);
        progress.startRoom(definition.enemyCount);
        expect(progress.doorOpen).toBe(false);
        for(let enemy=0;enemy<definition.enemyCount;enemy++)
          progress.registerEnemyDefeated();
        expect(progress.doorOpen).toBe(true);
        expect(progress.chapterComplete).toBe(room===30);
        expect(progress.advance()).toBe(room===30 ? null : room+1);
      }
    });
    it('ensures six boss encounters have two valid health phases and correct names',()=>{
      for(let room=5;room<=30;room+=5){
        const def=getRoomDefinition(room,worldId);
        expect(def.isBossRoom).toBe(true);
        for(let slot=0;slot<def.enemyCount;slot++){
          const profile=getBossProfile(room,slot,worldId);
          expect(profile.phaseOne.patterns.length).toBeGreaterThan(0);
          expect(profile.phaseTwo.patterns.length).toBeGreaterThan(0);
          expect(getWorldBossName(worldId,room,slot).length).toBeGreaterThan(2);
          for(const phase of [1,2] as const){
            for(let volley=0;volley<5;volley++){
              const pattern=getBossPlan(room,phase,volley,slot,worldId).pattern;
              expect(pattern.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });
}
describe('Phase 10 — multi-stage boss, hazards, and persistence',()=>{
  it('cannot open chamber 20 until Gunner and BOTH Bloom Sentinels die',()=>{
    const progress=new RoomProgress(30);
    progress.roomNumber=20;
    progress.startRoom(1);
    expect(nextBrambleStage('idle')).toBe('wind');
    expect(nextBrambleStage('wind')).toBe('growth');
    expect(nextBrambleStage('growth')).toBe('explosion');
    expect(nextBrambleStage('explosion')).toBe('handoff');
    for(const stage of ['wind','growth','explosion','handoff'] as const)
      expect(brambleDamageAllowed(stage)).toBe(false);
    expect(BRAMBLE_CINEMATIC.sentinelAttackRateMultiplier).toBe(3);
    progress.addEnemies(2);
    progress.registerEnemyDefeated();
    expect(progress.doorOpen).toBe(false);
    progress.registerEnemyDefeated();
    expect(progress.doorOpen).toBe(false);
    progress.registerEnemyDefeated();
    expect(progress.doorOpen).toBe(true);
  });
  it('tracks Snow Sentinel reinforcements without ending the encounter early',()=>{
    const p=new RoomProgress(30);
    p.roomNumber=15;p.startRoom(1);
    p.addEnemies(3);
    for(let i=0;i<3;i++) {
      p.registerEnemyDefeated();
      expect(p.doorOpen).toBe(false);
    }
    p.registerEnemyDefeated();
    expect(p.doorOpen).toBe(true);
  });
  it('never forces poison circles or reserved growing trees to overlap',()=>{
    const arena=getRoomDefinition(30,1).layout.bounds;
    const fixed=()=>0.41;
    const first=selectPoisonLocations(8,56,arena,[],fixed,
      {x:arena.x+arena.width/2,y:arena.y+arena.height/2});
    const next=selectPoisonLocations(8,56,arena,first,fixed);
    const sites=[...first,...next];
    for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++)
      expect(poisonZonesOverlap(sites[i]!,sites[j]!)).toBe(false);
  });
  it('displays only integer HP without changing stored combat precision',()=>{
    for(const n of [0,0.00001,1,1.0000002,99.19,200.001])
      expect(Number.isInteger(displayedHp(n))).toBe(true);
    expect(displayedHp(1.0000002)).toBe(2);
  });
  it('preserves validated legacy saves, world unlock and ability identifiers',()=>{
    const save=defaultProfile();
    const old={...save,version:3 as const,selectedWorld:2 as const,completedWorlds:1,
      worldBestRooms:[30,17,1,1,1],highestRoom:30};
    const restored=validateProfile(old);
    expect(restored.version).toBe(4);
    expect(restored.selectedWorld).toBe(2);
    expect(restored.worldBestRooms.slice(0,2)).toEqual([30,17]);
    expect(restored.abilityLevels['ranger-rain']).toBe(1);
    expect(restored.abilityLevels['frost-ring']).toBe(1);
  });
});

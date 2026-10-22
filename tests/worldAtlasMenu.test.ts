import {describe,expect,it} from 'vitest';
import {worldAtlasEntries,canTravelToWorld} from '../src/worlds/worldAtlas';
import {WORLDS,isWorldUnlocked, type WorldId} from '../src/worlds/worldConfig';
import {CHAPTER_ROOM_COUNT} from '../src/rooms/roomConfig';
import {applyProfileAction,defaultProfile,validateProfile} from '../src/progression/ProgressStore';

describe('New 2.5D world showcase and Mario-style destination map',()=>{
  it('renders five unique world destinations with their original themes',()=>{
    const worlds=worldAtlasEntries(1,0,[1,1,1,1,1]);
    expect(worlds).toHaveLength(5);
    expect(worlds.map(item=>item.world.id)).toEqual([1,2,3,4,5]);
    expect(worlds.map(item=>item.world.name)).toEqual([
      'Verdant Ruins','Frozen Hollow','Ember Wastes','Storm Citadel','Void Realm']);
    expect(new Set(WORLDS.map(w=>w.accent)).size).toBe(5);
    expect(worlds.filter(item=>item.selected)).toHaveLength(1);
  });

  it('starts with only the first world available, matching saved progress',()=>{
    const profile=defaultProfile();
    const worlds=worldAtlasEntries(profile.selectedWorld,profile.completedWorlds,
      profile.worldBestRooms);
    expect(worlds.map(item=>item.unlocked)).toEqual([true,false,false,false,false]);
    expect(worlds[0]!.progress).toBeCloseTo(1/CHAPTER_ROOM_COUNT);
    expect(worlds[1]!.requirement).toBe('Voltooi wereld 1');
    expect(canTravelToWorld(2,profile.completedWorlds)).toBe(false);
    expect(applyProfileAction(profile,{type:'selectWorld',id:2}).selectedWorld).toBe(1);
  });

  it('unlocks worlds sequentially without revealing inaccessible destinations',()=>{
    for(let completed=0;completed<=4;completed++){
      const entries=worldAtlasEntries(1,completed,[30,19,12,3,1]);
      for(const entry of entries){
        expect(entry.unlocked).toBe(isWorldUnlocked(entry.world.id,completed));
        expect(canTravelToWorld(entry.world.id,completed)).toBe(entry.unlocked);
      }
      expect(entries.filter(e=>e.unlocked)).toHaveLength(completed+1);
    }
  });

  it('lets the player tap an unlocked realm then return to the selected showcase',()=>{
    const start=validateProfile({...defaultProfile(),completedWorlds:2});
    const after=applyProfileAction(start,{type:'selectWorld',id:3});
    expect(after.selectedWorld).toBe(3);
    const entries=worldAtlasEntries(after.selectedWorld,after.completedWorlds,
      after.worldBestRooms);
    expect(entries[2]!.selected).toBe(true);
    expect(entries[2]!.unlocked).toBe(true);
    expect(entries.filter(e=>e.selected)).toHaveLength(1);
    expect(applyProfileAction(after,{type:'selectWorld',id:5}).selectedWorld).toBe(3);
    expect(applyProfileAction(after,{type:'selectWorld',id:1}).selectedWorld).toBe(1);
  });

  it('shows exact per-world completion and caps completed progress at 30',()=>{
    const entries=worldAtlasEntries(2,3,[30,15,7,100,1]);
    expect(entries[0]!.complete).toBe(true);
    expect(entries[0]!.progress).toBe(1);
    expect(entries[1]!.progress).toBe(.5);
    expect(entries[2]!.bestRoom).toBe(7);
    expect(entries[3]!.complete).toBe(true);
    expect(entries[3]!.bestRoom).toBe(30);
    expect(entries[4]!.progress).toBe(0);
    for(const entry of entries){
      expect(entry.progress).toBeGreaterThanOrEqual(0);
      expect(entry.progress).toBeLessThanOrEqual(1);
    }
  });

  it('preserves the existing five-world IDs and never modifies the profile by previewing',()=>{
    const profile=defaultProfile();
    const before=JSON.stringify(profile);
    const first=worldAtlasEntries(profile.selectedWorld,profile.completedWorlds,
      profile.worldBestRooms);
    const second=worldAtlasEntries(profile.selectedWorld,profile.completedWorlds,
      profile.worldBestRooms);
    expect(first).toEqual(second);
    expect(JSON.stringify(profile)).toBe(before);
    for(const id of [1,2,3,4,5] as WorldId[]){
      expect(WORLDS[id-1]?.id).toBe(id);
    }
  });
});

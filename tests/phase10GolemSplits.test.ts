import {describe,expect,it} from 'vitest';
import {shouldSplitFrozenGiant} from '../src/enemies/frozenSplit';
import {RoomProgress} from '../src/rooms/RoomProgress';
describe('Phase 10 — Snow Sentinel summoned Glacier Golem regression',()=>{
  it('only the intended world-2 normal tank splits, not summoned Golems',()=>{
    expect(shouldSplitFrozenGiant(2,'tank','tank-101')).toBe(true);
    expect(shouldSplitFrozenGiant(1,'tank','tank-101')).toBe(false);
    expect(shouldSplitFrozenGiant(2,'archer','archer-101')).toBe(false);
    for(const id of ['sentinel-golem-9','sentinel-golem-22'])
      expect(shouldSplitFrozenGiant(2,'tank',id)).toBe(false);
  });
  it('a Snow Sentinel plus summoned Golems can finish without extra forced Puffs',()=>{
    const room = new RoomProgress(30);
    room.roomNumber = 15;
    room.startRoom(1);
    room.addEnemies(4);
    for(let i=0;i<4;i++) {
      const id = 'sentinel-golem-' + i;
      if(shouldSplitFrozenGiant(2,'tank',id))room.addEnemies(2);
      room.registerEnemyDefeated();
      expect(room.doorOpen).toBe(false);
    }
    room.registerEnemyDefeated(); // Snow Sentinel is the last defeat
    expect(room.doorOpen).toBe(true);
  });
});

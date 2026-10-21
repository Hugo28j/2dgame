import { describe, it, expect } from 'vitest';
import { CHAPTER_ROOM_COUNT, getRoomDefinition } from '../src/rooms/roomConfig';
import { getWorldBossName, WORLDS } from '../src/worlds/worldConfig';
import { getWorldCharacter } from '../src/enemies/worldCharacters';
import { BOSS_ENCOUNTER_ARCHETYPES, getBossPlan, getBossProfile } from '../src/enemies/bossProfiles';
import { SPORE_POISON, poisonActive, poisonCovers, poisonTickDue } from '../src/enemies/poisonHazard';

describe('30-room campaigns and world-one level-20 split bosses', () => {
  it('has exactly seven themed bosses in six fights, and room 30 is the finale', () => {
    expect(CHAPTER_ROOM_COUNT).toBe(30);
    expect(Object.keys(BOSS_ENCOUNTER_ARCHETYPES)).toEqual(['5', '10', '15', '20', '25', '30']);
    expect(getRoomDefinition(15).enemyCount).toBe(1);
    expect(getRoomDefinition(15).enemySpawns).toHaveLength(1);
    expect(getRoomDefinition(15, 2).enemySpawns).toHaveLength(1);
    expect(getWorldBossName(1, 15)).toBe('Spore Alchemist');
    expect(getWorldBossName(1, 20, 0)).toBe('Bramble Gunner');
    expect(getWorldBossName(1, 20, 1)).toBe('Bloom Sentinel');
    expect(getWorldBossName(1, 30)).toBe('Heart of the Grove');
    expect(getWorldBossName(2, 15)).toBe('Snow Sentinel');
    for (const world of WORLDS.filter(world => world.id !== 2)) {
      const bossRoom = world.id === 1 ? 20 : 15;
      const first = getWorldCharacter(world.id, 'boss', bossRoom, 0);
      const second = getWorldCharacter(world.id, 'boss', bossRoom, 1);
      expect(first.name).not.toBe(second.name);
      expect(first.textureKey).not.toBe(second.textureKey);
    }
  });
  it('moves Gunner/Sentinel patterns to chamber 20 and keeps other boss patterns', () => {
    expect(getBossProfile(15, 0, 1).phaseOne.patterns).toEqual(['single']);
    expect(getBossProfile(20, 0, 1).phaseOne.patterns).toEqual(['machinegun']);
    expect(getBossProfile(20, 1, 1).phaseOne.patterns).toEqual(['spiral']);
    expect(getBossProfile(15, 0, 3).phaseOne.patterns).toEqual(['machinegun']);
    expect(getBossPlan(25, 1, 0).tempo).toBeLessThan(0.6);
    expect(getBossPlan(25, 2, 0).tempo).toBeLessThan(0.4);
  });
});
describe('Spore Alchemist poison pools', () => {
  it('last 1.5 seconds, cover only their visible circular area and obey damage intervals', () => {
    expect(SPORE_POISON.durationMs).toBe(1500);
    expect(SPORE_POISON.bottleFlightMs).toBeGreaterThan(300);
    expect(poisonActive(999, 1000)).toBe(false);
    expect(poisonActive(1000, 1000)).toBe(true);
    expect(poisonActive(2499, 1000)).toBe(true);
    expect(poisonActive(2500, 1000)).toBe(false);
    expect(poisonCovers(20, 20, 60, 80, 20)).toBe(true);
    expect(poisonCovers(20, 20, 60, 81, 20)).toBe(false);
    expect(poisonTickDue(100, 200)).toBe(false);
    expect(poisonTickDue(200, 200)).toBe(true);
  });
});

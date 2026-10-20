import { describe, it, expect } from 'vitest';
import { CHAPTER_ROOM_COUNT, getRoomDefinition } from '../src/rooms/roomConfig';
import { getWorldBossName, WORLDS } from '../src/worlds/worldConfig';
import { getWorldCharacter } from '../src/enemies/worldCharacters';
import { BOSS_ENCOUNTER_ARCHETYPES, getBossPlan, getBossProfile } from '../src/enemies/bossProfiles';
import { SPORE_POISON, poisonActive, poisonCovers, poisonTickDue } from '../src/enemies/poisonHazard';

describe('30-room campaign and two distinct room-15 bosses', () => {
  it('has exactly seven themed bosses in six fights, and room 30 is the finale', () => {
    expect(CHAPTER_ROOM_COUNT).toBe(30);
    expect(Object.keys(BOSS_ENCOUNTER_ARCHETYPES)).toEqual(['5', '10', '15', '20', '25', '30']);
    expect(getRoomDefinition(15).enemyCount).toBe(2);
    expect(getRoomDefinition(15).enemySpawns).toHaveLength(2);
    const [a, b] = getRoomDefinition(15).enemySpawns;
    expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThan(120);
    expect(getWorldBossName(1, 15)).toBe('Bramble Gunner');
    expect(getWorldBossName(1, 15, 1)).toBe('Bloom Sentinel');
    expect(getWorldBossName(1, 30)).toBe('Heart of the Grove');
    for (const world of WORLDS) {
      const first = getWorldCharacter(world.id, 'boss', 15, 0);
      const second = getWorldCharacter(world.id, 'boss', 15, 1);
      expect(first.name).not.toBe(second.name);
      expect(first.textureKey).not.toBe(second.textureKey);
    }
  });
  it('retains separate shooting styles in chamber 15 and speeds up Jade Matriarch', () => {
    expect(getBossProfile(15, 0).phaseOne.patterns).toEqual(['machinegun']);
    expect(getBossProfile(15, 1).phaseOne.patterns).toEqual(['spiral']);
    expect(getBossPlan(25, 1, 0).tempo).toBeLessThan(0.6);
    expect(getBossPlan(25, 2, 0).tempo).toBeLessThan(0.4);
  });
});
describe('Spore Alchemist poison pools', () => {
  it('last five seconds, cover only their visible circular area and obey damage intervals', () => {
    expect(SPORE_POISON.durationMs).toBe(5000);
    expect(SPORE_POISON.bottleFlightMs).toBeGreaterThan(300);
    expect(poisonActive(999, 1000)).toBe(false);
    expect(poisonActive(1000, 1000)).toBe(true);
    expect(poisonActive(5999, 1000)).toBe(true);
    expect(poisonActive(6000, 1000)).toBe(false);
    expect(poisonCovers(20, 20, 60, 80, 20)).toBe(true);
    expect(poisonCovers(20, 20, 60, 81, 20)).toBe(false);
    expect(poisonTickDue(100, 200)).toBe(false);
    expect(poisonTickDue(200, 200)).toBe(true);
  });
});

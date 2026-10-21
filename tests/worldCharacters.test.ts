import { describe, expect, it } from 'vitest';
import { HEROES, HERO_IDS, getHeroStats } from '../src/heroes/heroConfig';
import { getWorldCharacter, getWorldCharacterRoster } from '../src/enemies/worldCharacters';
import { getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { WORLDS, isWorldUnlocked, type WorldId } from '../src/worlds/worldConfig';
import { RunLedger } from '../src/progression/RunLedger';
import { applyProfileAction, defaultProfile, validateProfile } from '../src/progression/ProgressStore';

describe('themed world enemies and bosses', () => {
  it('defines 30 distinct themed mob characters with real sprite textures and stats', () => {
    const mobNames = new Set<string>();
    const textures = new Set<string>();
    for (const world of WORLDS) {
      const mobs = getWorldCharacterRoster(world.id);
      expect(mobs).toHaveLength(6);
      expect(new Set(mobs.map(m => m.kind)).size).toBe(6);
      for (const mob of mobs) {
        expect(mob.worldId).toBe(world.id);
        expect(mob.textureKey).toBe(`world-${world.id}-${mob.kind}`);
        expect(mob.name.length).toBeGreaterThan(3);
        expect(mob.primary).toBeGreaterThan(0);
        expect(getEnemyStatsForRoom(mob.kind, 25, world.id).maxHp).toBeGreaterThan(0);
        mobNames.add(mob.name);
        textures.add(mob.textureKey);
      }
    }
    expect(mobNames.size).toBe(30);
    expect(textures.size).toBe(30);
    expect(getWorldCharacter(2, 'tank').name).toBe('Glacier Golem');
    expect(getWorldCharacter(3, 'charger').name).toBe('Magma Hound');
    expect(getWorldCharacter(4, 'mage').name).toBe('Thunder Seer');
    expect(getWorldCharacter(5, 'bomber').name).toBe('Singularity');
  });

  it('gives all 34 active bosses unique names and sprites across 30-room worlds', () => {
    const bosses = WORLDS.flatMap(world =>
      [5, 10, 15, 20, 25, 30].flatMap(room =>
        Array.from({ length: room === 15 && world.id !== 2 ? 2 : 1 }, (_, slot) =>
          getWorldCharacter(world.id, 'boss', room, slot))));
    expect(new Set(bosses.map(boss => boss.name)).size).toBe(34);
    expect(new Set(bosses.map(boss => boss.textureKey)).size).toBe(34);
    for (const boss of bosses) {
      expect(boss.kind).toBe('boss');
      expect(boss.textureKey.startsWith(`world-${boss.worldId}-boss-`)).toBe(true);
    }
    expect(getWorldCharacter(5, 'boss', 30).name).toBe('Sovereign of Nothing');
  });
});

describe('four world-specific playable heroes', () => {
  it('adds four uniquely statted heroes to the original three', () => {
    expect(HERO_IDS).toHaveLength(7);
    const newHeroes = [
      ['frostblade', 2], ['pyromancer', 3], ['stormstrider', 4], ['voidwalker', 5],
    ] as const;
    for (const [id, world] of newHeroes) {
      expect(HEROES[id].requiredWorld).toBe(world);
      expect(HEROES[id].textureKey).toBe('hero-' + id);
      expect(HEROES[id].unlockCost).toBeGreaterThan(0);
      expect(getHeroStats(id, 1).maxHp).toBeGreaterThan(75);
      expect(getHeroStats(id, 10).damage).toBeGreaterThan(getHeroStats(id, 1).damage);
    }
    expect(HEROES.stormstrider.stats.movementSpeed).toBeGreaterThan(
      HEROES.ranger.stats.movementSpeed);
    expect(HEROES.voidwalker.stats.criticalChance).toBeGreaterThan(
      HEROES.ranger.stats.criticalChance);
  });

  it('prevents paying for heroes from future locked worlds', () => {
    let profile = applyProfileAction(defaultProfile(), { type: 'awardGold', amount: 2000 });
    for (const id of ['frostblade', 'pyromancer', 'stormstrider', 'voidwalker'] as const) {
      expect(applyProfileAction(profile, { type: 'unlockHero', id })).toEqual(profile);
    }
    expect(profile.unlockedHeroes).toEqual(['guardian']);

    for (let world = 1; world <= 4; world++) {
      const w = world as WorldId;
      const run = new RunLedger('complete-' + world, w);
      run.enterRoom(30);
      profile = applyProfileAction(profile, { type: 'settleRun', report: run.report(true) });
      const nextId = (['frostblade', 'pyromancer', 'stormstrider', 'voidwalker'] as const)[world - 1]!;
      expect(isWorldUnlocked(HEROES[nextId].requiredWorld, profile.completedWorlds)).toBe(true);
      const purchased = applyProfileAction(profile, { type: 'unlockHero', id: nextId });
      expect(purchased.unlockedHeroes).toContain(nextId);
      expect(purchased.selectedHero).toBe(nextId);
      expect(purchased.gold).toBe(profile.gold - HEROES[nextId].unlockCost);
      profile = purchased;
    }
  });

  it('migrates old hero-level save files without losing existing heroes', () => {
    const before = defaultProfile();
    const saved = validateProfile({
      ...before, gold: 400, unlockedHeroes: ['ranger', 'mage', 'guardian'],
      selectedHero: 'mage', heroLevels: { ranger: 5, mage: 3, guardian: 2 },
    });
    expect(saved.heroLevels.ranger).toBe(5);
    expect(saved.heroLevels.mage).toBe(3);
    expect(saved.heroLevels.guardian).toBe(2);
    for (const id of ['frostblade', 'pyromancer', 'stormstrider', 'voidwalker'] as const) {
      expect(saved.heroLevels[id]).toBe(1);
    }
    expect(saved.selectedHero).toBe('mage');
    expect(saved.gold).toBe(400);
  });
});

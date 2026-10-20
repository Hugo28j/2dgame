import { describe, expect, it } from 'vitest';
import {
  SaveManager, applyProfileAction, defaultProfile, validateProfile,
} from '../src/progression/ProgressStore';
import { armorBonuses, rollEnemyArmor, armorUpgradeCost } from '../src/progression/armor';
import { RunLedger } from '../src/progression/RunLedger';
import { RUN_UPGRADES, RunUpgradeDeck } from '../src/progression/runUpgrades';

describe('phase 8 run rewards', () => {
  it('counts every enemy and cleared room once, including boss bonuses', () => {
    const run = new RunLedger('test-run');
    run.enterRoom(5);
    expect(run.defeatEnemy('slime-1', 'slime')).toBe(true);
    expect(run.defeatEnemy('slime-1', 'slime')).toBe(false);
    expect(run.defeatEnemy('boss-2', 'boss')).toBe(true);
    expect(run.clearRoom(5)).toBe(true);
    expect(run.clearRoom(5)).toBe(false);
    // Kills and cleared rooms no longer give free gold.
    expect(run.runGold).toBe(0);
    expect(run.collectGold(2)).toBe(true);
    expect(run.collectGold(5)).toBe(true);
    run.recordDamage(27);
    run.recordDamage(-12);
    expect(run.report(true)).toEqual({
      runId: 'test-run', worldId: 1, reachedRoom: 5, roomsCleared: 1,
      enemiesDefeated: 2, bossesDefeated: 1, totalDamage: 27,
      earnedGold: 7, victory: true,
    });
  });

  it('settles once and updates the personal record across repeated calls', () => {
    const run = new RunLedger('exactly-once');
    run.enterRoom(4);
    run.clearRoom(1);
    const report = run.report(false);
    const start = defaultProfile();
    const earned = applyProfileAction(start, { type: 'settleRun', report });
    expect(earned.gold).toBe(start.gold + report.earnedGold);
    expect(earned.highestRoom).toBe(4);
    expect(applyProfileAction(earned, { type: 'settleRun', report })).toEqual(earned);
  });
});

describe('phase 8 save migration and permanent shop', () => {
  it('migrates an old v1 save without losing currency or equipment', () => {
    const old = {
      ...defaultProfile(), version: 1, gold: 700, selectedHero: 'mage',
      unlockedHeroes: ['ranger', 'mage'], heroLevels: { ranger: 4, mage: 3, guardian: 1 },
    };
    const migrated = validateProfile(old);
    expect(migrated.version).toBe(4);
    expect(migrated.gold).toBe(700);
    expect(migrated.selectedHero).toBe('guardian');
    expect(migrated.heroLevels.ranger).toBe(4);
    expect(migrated.permanentLevels.hp).toBe(0);
    expect(migrated.highestRoom).toBe(1);
  });

  it('replaces legacy permanent purchases with percentage armor upgrades', () => {
    let profile = { ...defaultProfile(), gold: 100000 };
    expect(applyProfileAction(profile, { type: 'upgradePermanent', id: 'hp' })).toEqual(profile);
    const item = rollEnemyArmor('normal', 0, 0, 0, 'old-test', 'enemy', 'guardian')!;
    profile = { ...profile, armorInventory: [item] };
    profile = applyProfileAction(profile, { type: 'equipArmor', id: item.id });
    const oldBonus = armorBonuses(profile.armorInventory, profile.equippedArmor.guardian, 'guardian').hp;
    const cost = armorUpgradeCost(item);
    profile = applyProfileAction(profile, { type: 'upgradeArmor', id: item.id });
    expect(profile.gold).toBe(100000 - cost);
    expect(armorBonuses(profile.armorInventory, profile.equippedArmor.guardian, 'guardian').hp).toBeGreaterThan(oldBonus);
    for (let i = 0; i < 35; i++) {
      profile = applyProfileAction(profile, { type: 'upgradeArmor', id: item.id });
    }
    expect(profile.armorInventory[0]?.level).toBe(30);
  });

  it('reads the legacy storage key and preserves progress after reloading', () => {
    const store = new Map<string, string>();
    store.set('dungeon-ascent:profile:v1', JSON.stringify({ ...defaultProfile(), version: 1, gold: 500 }));
    const local = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };
    const first = new SaveManager(local);
    expect(first.current.gold).toBe(500);
    const itemFromFloor = rollEnemyArmor('normal', 0, 0, 0,
      'persist-armor', 'enemy1', 'guardian')!;
    expect(first.dispatch({ type: 'collectArmor', item: itemFromFloor })).toBe(true);
    const second = new SaveManager(local);
    expect(second.current.gold).toBe(500);
    expect(second.current.armorInventory).toHaveLength(1);
    const item = second.current.armorInventory[0]!;
    expect(second.dispatch({ type: 'equipArmor', id: item.id })).toBe(true);
    const third = new SaveManager(local);
    expect(third.current.equippedArmor.guardian.helm).toBe(item.id);
    second.reset();
    expect(new SaveManager(local).current).toEqual(defaultProfile());
  });

  it('sanitizes corrupt, nonfinite and unknown save data', () => {
    const corrupt = validateProfile({
      version: 2, gold: Infinity, highestRoom: 100000,
      selectedHero: 'hacker', unlockedHeroes: ['hacker'],
      permanentLevels: { hp: -4, damage: 999, weaponSpeed: NaN },
      settledRunIds: [42, null, 'ok', 'ok'],
    });
    expect(corrupt.gold).toBe(0);
    expect(corrupt.highestRoom).toBe(30);
    expect(corrupt.permanentLevels.hp).toBe(0);
    expect(corrupt.permanentLevels.damage).toBe(15);
    expect(corrupt.selectedHero).toBe('guardian');
    expect(corrupt.settledRunIds).toEqual(['ok']);
  });
});

describe('phase 8 temporary choices', () => {
  it('offers unique cards, respects limits and resets on a new run', () => {
    const deck = new RunUpgradeDeck(() => 0.5);
    const cards = deck.offer();
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map(c => c.id)).size).toBe(3);
    expect(deck.offer(false).some(card => card.id === 'healing')).toBe(false);
    const projectile = RUN_UPGRADES.find(upgrade => upgrade.id === 'projectile')!;
    expect(projectile.maxStacks).toBe(1);
    expect(deck.choose('projectile')).toBe(true);
    expect(deck.choose('projectile')).toBe(false);
    expect(deck.offer().some(card => card.id === 'projectile')).toBe(false);
    expect(new RunUpgradeDeck().count('projectile')).toBe(0);
  });
});

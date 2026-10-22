import { describe, expect, it } from 'vitest';
import { RunCheckpointStore, validateRunCheckpoint, type RunCheckpoint } from '../src/progression/RunCheckpoint';
import { RunLedger } from '../src/progression/RunLedger';
import { RunUpgradeDeck } from '../src/progression/runUpgrades';

function checkpoint(): RunCheckpoint {
  const ledger = new RunLedger('resume-test-123', 2);
  ledger.enterRoom(1);
  ledger.defeatEnemy('mob-1', 'normal');
  ledger.clearRoom(1);
  ledger.enterRoom(2);
  ledger.defeatEnemy('mob-2', 'normal');
  ledger.clearRoom(2);
  ledger.collectGold(135);
  ledger.enterRoom(3);
  return {
    version: 1, savedAt: 1_797_200_000_000, worldId: 2, room: 3,
    heroId: 'guardian', weaponId: 'warhammer',
    health: 83, shield: 23, upgrades: ['damage','maxHp','projectile'],
    ledger: ledger.snapshot(),
  };
}
function storage() {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
    removeItem: (key: string) => { memory.delete(key); },
  };
}
describe('persistent unfinished-run checkpoints', () => {
  it('retains world, active room, hero, equipped weapon, HP, gold and powerups across reloads', () => {
    const fake = storage();
    const saved = checkpoint();
    const first = new RunCheckpointStore(fake);
    expect(first.save(saved)).toBe(true);
    const later = new RunCheckpointStore(fake).load();
    expect(later).toEqual(saved);
    expect(later?.ledger.gold).toBe(135);
    expect(later?.upgrades).toEqual(['damage','maxHp','projectile']);
    expect(later?.room).toBe(3);
    later!.health = 11;
    first.clear();
    expect(new RunCheckpointStore(fake).load()).toBeNull();
  });
  it('restores RunLedger without paying the same room or enemy twice', () => {
    const save = checkpoint();
    const ledger = new RunLedger(save.ledger.runId, save.worldId);
    ledger.restore(save.ledger);
    expect(ledger.runGold).toBe(135);
    expect(ledger.report(false).reachedRoom).toBe(3);
    expect(ledger.report(false).roomsCleared).toBe(2);
    expect(ledger.clearRoom(2)).toBe(false);
    expect(ledger.defeatEnemy('mob-2', 'normal')).toBe(false);
    expect(ledger.clearRoom(3)).toBe(true);
    expect(ledger.report(false).earnedGold).toBe(135);
    expect(ledger.report(false).roomsCleared).toBe(3);
  });
  it('reconstitutes upgrade stacks without applying healing twice', () => {
    const first = new RunUpgradeDeck();
    first.choose('damage'); first.choose('maxHp'); first.choose('damage');
    const restored = new RunUpgradeDeck();
    restored.restore(first.snapshot());
    expect(restored.count('damage')).toBe(2);
    expect(restored.count('maxHp')).toBe(1);
    expect(restored.snapshot()).toEqual(first.snapshot());
  });
  it('rejects corrupt saves, worlds, locked weapon combinations and zero HP', () => {
    const good = checkpoint();
    for (const candidate of [
      null, {}, { ...good, version: 3 },
      { ...good, health: 0 }, { ...good, room: 31 },
      { ...good, weaponId: 'bow' }, { ...good, worldId: 0 },
      { ...good, ledger: { ...good.ledger, runId: '' } },
      { ...good, ledger: { ...good.ledger, reachedRoom: 5 } },
      { ...good, upgrades: ['not-a-powerup'] },
    ]) expect(validateRunCheckpoint(candidate)).toBeNull();
    expect(validateRunCheckpoint(good)).not.toBeNull();
  });
  it('keeps last valid in-session checkpoint if localStorage is unavailable', () => {
    const blocked = {
      getItem: (_key: string): string | null => { throw Error('blocked'); },
      setItem: (_key: string, _value: string) => { throw Error('blocked'); },
      removeItem: (_key: string) => { throw Error('blocked'); },
    };
    const cp = checkpoint();
    const store = new RunCheckpointStore(blocked);
    expect(store.save(cp)).toBe(true);
    expect(store.load()).toEqual(cp);
    store.clear();
    expect(store.load()).toBeNull();
  });
});

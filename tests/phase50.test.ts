import { describe, expect, it } from 'vitest';
import { BOSSES, BOSS_ENCOUNTER_ARCHETYPES, getBossPlan, getBossProfile, getBossTier } from '../src/enemies/bossProfiles';
import { getBossName, getEnemyStatsForRoom } from '../src/enemies/enemyConfig';
import { shotAngles } from '../src/enemies/projectilePatterns';
import { mouseButtonKey, defaultKeyBindings, formatBinding, rebindKey,
  validateKeyBindings, keyboardVector } from '../src/input/keyBindings';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';
import { CHAPTER_ROOM_COUNT, getRoomDefinition } from '../src/rooms/roomConfig';
import { RunLedger } from '../src/progression/RunLedger';

describe('mouse and keyboard bindings', () => {
  it('accepts primary, secondary, middle and extra buttons; ignores invalid mouse buttons', () => {
    expect([0, 1, 2, 3, 4].map(mouseButtonKey)).toEqual([
      'MOUSE1', 'MOUSE3', 'MOUSE2', 'MOUSE4', 'MOUSE5',
    ]);
    expect(mouseButtonKey(-1)).toBeNull();
    expect(mouseButtonKey(8)).toBeNull();
    expect(mouseButtonKey(1.5)).toBeNull();
    expect(defaultKeyBindings().shoot).toEqual(['MOUSE1']);
    expect(formatBinding(['MOUSE4'])).toBe('MUIS 4');
  });

  it('remaps skills to extra mouse buttons and preserves existing input compatibility', () => {
    const first = rebindKey(defaultKeyBindings(), 'dash', 'MOUSE4');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.bindings.dash).toEqual(['MOUSE4']);
    expect(first.bindings.shoot).toEqual(['MOUSE1']);
    expect(rebindKey(first.bindings, 'iceBlast', 'MOUSE4')).toEqual({
      ok: false, reason: 'conflict', action: 'dash',
    });
    expect(keyboardVector(new Set(['Z', 'D']), first.bindings).x).toBeCloseTo(Math.SQRT1_2);
    expect(validateKeyBindings(first.bindings)).toEqual(first.bindings);
  });

  it('can move shooting to another button without duplicating action bindings', () => {
    const first = rebindKey(defaultKeyBindings(), 'shoot', 'MOUSE2');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = rebindKey(first.bindings, 'fireNova', 'MOUSE1');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.bindings.fireNova).toEqual(['MOUSE1']);
    expect(second.bindings.shoot).toEqual(['MOUSE2']);
    const saved = applyProfileAction(defaultProfile(), { type: 'rebindKey', action: 'dash', key: 'MOUSE5' });
    expect(saved.settings.keyBindings.dash).toEqual(['MOUSE5']);
  });

  it('migrates a previous saved mapping without a shoot field', () => {
    const previous = defaultKeyBindings() as Partial<ReturnType<typeof defaultKeyBindings>>;
    delete previous.shoot;
    const migrated = validateKeyBindings(previous);
    expect(migrated.shoot).toEqual(['MOUSE1']);
    expect(migrated.moveUp).toEqual(['W', 'Z']);
  });
});

describe('six boss arenas and seven original archetypes', () => {
  it('builds 30 rooms, with two bosses on room 15', () => {
    expect(CHAPTER_ROOM_COUNT).toBe(30);
    expect(BOSSES).toHaveLength(10);
    const bossRooms = Array.from({ length: CHAPTER_ROOM_COUNT }, (_, i) => i + 1)
      .filter(room => getRoomDefinition(room).isBossRoom);
    expect(bossRooms).toEqual([5, 10, 15, 20, 25, 30]);
    for (const room of bossRooms) {
      expect(getRoomDefinition(room).enemyCount).toBe(1);
      expect(getBossProfile(room).name).toBe(getBossName(room));
      expect(getBossTier(room)).toBe(room / 5);
      expect(BOSS_ENCOUNTER_ARCHETYPES[room]).toHaveLength(room === 15 ? 2 : 1);
    }
    expect(getBossProfile(5)).toBe(BOSSES[0]);
    expect(getBossProfile(10)).toBe(BOSSES[2]);
    expect(getBossProfile(15)).toBe(BOSSES[4]);
    expect(getBossProfile(15, 1)).toBe(BOSSES[3]);
    expect(getBossProfile(20)).toBe(BOSSES[6]);
    expect(getBossProfile(25)).toBe(BOSSES[7]);
    expect(getBossProfile(30)).toBe(BOSSES[9]);
  });

  it('preserves unique phase-two attacks and speeds up Jade Matriarch', () => {
    const signatures = new Set<string>();
    for (const room of [5, 10, 15, 20, 25, 30]) {
      const bossSlots = room === 15 ? 2 : getRoomDefinition(room).enemyCount;
      for (let slot = 0; slot < bossSlots; slot++) {
        const profile = getBossProfile(room, slot);
        expect(profile.phaseOne).not.toEqual(profile.phaseTwo);
        expect(getBossPlan(room, 1, 0, slot).pattern).toBeDefined();
        expect(getBossPlan(room, 2, 0, slot).pattern).toBeDefined();
        signatures.add(JSON.stringify([profile.phaseOne, profile.phaseTwo]));
      }
    }
    expect(signatures.size).toBe(7);
    expect(getBossPlan(15, 1, 0).pattern).toBe('machinegun');
    expect(getBossPlan(15, 1, 0, 1).pattern).toBe('spiral');
    expect(getBossPlan(25, 1, 0).tempo).toBeLessThan(0.6);
    expect(getBossPlan(25, 2, 0).tempo).toBeLessThan(0.4);
    expect(getBossPlan(20, 2, 0).bombs).toBeGreaterThan(3);
  });

  it('scales boss damage and regular HP across the six boss encounters', () => {
    const rooms = [5, 10, 15, 20, 25, 30];
    const stats = rooms.map(room => getEnemyStatsForRoom('boss', room));
    for (let i = 1; i < stats.length; i++) {
      // Bramble Gunner has reduced HP; buffed Spore Alchemist can exceed the following Jade Matriarch.
      if (rooms[i] !== 15 && rooms[i] !== 25)
        expect(stats[i]!.maxHp).toBeGreaterThan(stats[i - 1]!.maxHp);
      expect(stats[i]!.damage).toBeGreaterThan(stats[i - 1]!.damage);
    }
    // Bloom Sentinel, the other room-15 boss, still follows regular scaling.
    expect(getEnemyStatsForRoom('boss', 15, 1, 1).maxHp)
      .toBeGreaterThan(getEnemyStatsForRoom('boss', 10).maxHp);
  });

  it('generates fast machinegun, rotating spiral, cross and circular phase-two patterns', () => {
    expect(shotAngles('machinegun', 0.8)).toEqual([0.8]);
    expect(shotAngles('spiral', 0, 3)).toEqual([Math.PI / 2]);
    expect(shotAngles('reverse-spiral', 0, 3)).toEqual([-Math.PI / 2]);
    expect(shotAngles('cross', 0, 0)).toHaveLength(4);
    expect(shotAngles('ring', 0)).toHaveLength(12);
    expect(shotAngles('offset-ring', 0, 0)[0]).toBe(0);
    expect(shotAngles('offset-ring', 0, 1)[0]).toBeCloseTo(Math.PI / 12);
    expect(shotAngles('wide', 0)).toHaveLength(5);
    expect(shotAngles('radial', 0)).toHaveLength(8);
  });

  it('tracks runs and persisted personal records beyond room twenty', () => {
    const ledger = new RunLedger('30-rooms');
    ledger.enterRoom(30);
    expect(ledger.clearRoom(30)).toBe(true);
    expect(ledger.report(true).reachedRoom).toBe(30);
    const saved = applyProfileAction(defaultProfile(),
      { type: 'settleRun', report: ledger.report(true) });
    expect(saved.highestRoom).toBe(30);
  });
});

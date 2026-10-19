import { describe, expect, it } from 'vitest';
import { BOSSES, getBossPlan, getBossProfile, getBossTier } from '../src/enemies/bossProfiles';
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

describe('ten unique escalating bosses', () => {
  it('builds exactly 50 rooms and 10 bosses, one after every five rooms', () => {
    expect(CHAPTER_ROOM_COUNT).toBe(50);
    expect(BOSSES).toHaveLength(10);
    const bossRooms = Array.from({ length: 50 }, (_, i) => i + 1)
      .filter(room => getRoomDefinition(room).isBossRoom);
    expect(bossRooms).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    for (const room of bossRooms) {
      expect(getRoomDefinition(room).enemyCount).toBe(1);
      expect(getBossProfile(room).name).toBe(getBossName(room));
      expect(getBossTier(room)).toBe(room / 5);
    }
  });

  it('every boss uses a different attack signature and distinctly changes at half HP', () => {
    const signatures = new Set<string>();
    BOSSES.forEach((profile, i) => {
      expect(profile.phaseOne).not.toEqual(profile.phaseTwo);
      const room = (i + 1) * 5;
      const first = getBossPlan(room, 1, 0);
      const second = getBossPlan(room, 2, 0);
      expect(first.pattern).toBeDefined();
      expect(second.pattern).toBeDefined();
      const signature = JSON.stringify([profile.phaseOne, profile.phaseTwo]);
      expect(signatures.has(signature)).toBe(false);
      signatures.add(signature);
    });
    expect(signatures.size).toBe(10);
    expect(getBossPlan(25, 1, 1).pattern).toBe('machinegun');
    expect(getBossPlan(25, 2, 0).pattern).toBe('ring');
    expect(getBossPlan(10, 1, 0).bombs).toBeGreaterThan(0);
    expect(getBossPlan(35, 2, 0).bombs).toBeGreaterThan(3);
  });

  it('boss health and damage increase strictly from boss one to boss ten', () => {
    const stats = Array.from({ length: 10 }, (_, i) => getEnemyStatsForRoom('boss', (i + 1) * 5));
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i]!.maxHp).toBeGreaterThan(stats[i - 1]!.maxHp);
      expect(stats[i]!.damage).toBeGreaterThan(stats[i - 1]!.damage);
    }
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
    const ledger = new RunLedger('50-rooms');
    ledger.enterRoom(50);
    expect(ledger.clearRoom(50)).toBe(true);
    expect(ledger.report(true).reachedRoom).toBe(50);
    const saved = applyProfileAction(defaultProfile(),
      { type: 'settleRun', report: ledger.report(true) });
    expect(saved.highestRoom).toBe(50);
  });
});

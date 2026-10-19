import { describe, expect, it } from 'vitest';
import {
  CONTROL_ACTIONS, defaultKeyBindings, formatBinding, keyboardVector,
  normalizeBindKey, rebindKey, validateKeyBindings,
} from '../src/input/keyBindings';
import { SaveManager, applyProfileAction, defaultProfile, validateProfile } from '../src/progression/ProgressStore';

describe('custom keyboard controls', () => {
  it('keeps QWERTY and AZERTY movement, plus default ability keys', () => {
    const defaultMap = defaultKeyBindings();
    expect(defaultMap.moveUp).toEqual(['W', 'Z']);
    expect(defaultMap.moveLeft).toEqual(['A', 'Q']);
    expect(defaultMap.dash).toEqual(['1']);
    expect(defaultMap.fireNova).toEqual(['2']);
    expect(defaultMap.iceBlast).toEqual(['3']);
    expect(CONTROL_ACTIONS).toHaveLength(7);
    expect(keyboardVector(new Set(['Z', 'D']), defaultMap).x).toBeCloseTo(Math.SQRT1_2);
    expect(keyboardVector(new Set(['W', 'Z']), defaultMap)).toEqual({ x: 0, y: -1 });
    expect(keyboardVector(new Set(['W', 'S']), defaultMap)).toEqual({ x: 0, y: 0 });
  });

  it('remaps an ability, stops accepting its former key, and does not alter other controls', () => {
    const initial = defaultKeyBindings();
    const result = rebindKey(initial, 'fireNova', 'e');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bindings.fireNova).toEqual(['E']);
    expect(result.bindings.dash).toEqual(['1']);
    expect(initial.fireNova).toEqual(['2']);
    expect(formatBinding(result.bindings.moveUp)).toBe('W / Z');
  });

  it('rejects reserved keys and conflicting mappings', () => {
    const initial = defaultKeyBindings();
    expect(rebindKey(initial, 'dash', 'Escape')).toEqual({ ok: false, reason: 'invalid' });
    expect(rebindKey(initial, 'dash', 'Shift')).toEqual({ ok: false, reason: 'invalid' });
    expect(rebindKey(initial, 'dash', 'Q')).toEqual({
      ok: false, reason: 'conflict', action: 'moveLeft',
    });
    expect(rebindKey(initial, 'dash', '2')).toEqual({
      ok: false, reason: 'conflict', action: 'fireNova',
    });
    expect(normalizeBindKey(' ')).toBe('SPACE');
    expect(normalizeBindKey('ArrowRight')).toBe('ARROWRIGHT');
    expect(normalizeBindKey('F12')).toBeNull();
    expect(formatBinding(['ARROWUP', 'SPACE'])).toBe('↑ / SPATIE');
  });

  it('persists controls and lets players reset only the keybinds', () => {
    const store = new Map<string, string>();
    const local = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };
    const first = new SaveManager(local);
    expect(first.dispatch({ type: 'rebindKey', action: 'iceBlast', key: 'R' })).toBe(true);
    expect(first.dispatch({ type: 'rebindKey', action: 'fireNova', key: 'R' })).toBe(false);
    expect(new SaveManager(local).current.settings.keyBindings.iceBlast).toEqual(['R']);
    expect(first.dispatch({ type: 'resetKeyBindings' })).toBe(true);
    expect(new SaveManager(local).current.settings.keyBindings).toEqual(defaultKeyBindings());
  });

  it('migrates prior v2 and legacy v1 saves without changing currency or unlocked heroes', () => {
    const previousSave = {
      ...defaultProfile(),
      gold: 816, unlockedHeroes: ['ranger', 'mage'],
      settings: { musicEnabled: false, sfxEnabled: true },
    };
    const migrated = validateProfile(previousSave);
    expect(migrated.gold).toBe(816);
    expect(migrated.unlockedHeroes).toEqual(['ranger', 'mage']);
    expect(migrated.settings.musicEnabled).toBe(false);
    expect(migrated.settings.keyBindings).toEqual(defaultKeyBindings());

    const v1 = validateProfile({ ...previousSave, version: 1 });
    expect(v1.settings.keyBindings).toEqual(defaultKeyBindings());
  });

  it('sanitizes malicious or duplicated mappings from browser storage', () => {
    expect(validateKeyBindings({ moveUp: ['<SCRIPT>'] })).toEqual(defaultKeyBindings());
    const tampered = {
      ...defaultKeyBindings(),
      dash: ['Q'],
    };
    expect(validateKeyBindings(tampered)).toEqual(defaultKeyBindings());
    const mapped = applyProfileAction(defaultProfile(),
      { type: 'rebindKey', action: 'moveUp', key: 'ArrowUp' });
    expect(mapped.settings.keyBindings.moveUp).toEqual(['ARROWUP']);
    expect(keyboardVector(new Set(['ARROWUP']), mapped.settings.keyBindings)).toEqual({ x: 0, y: -1 });
  });
});

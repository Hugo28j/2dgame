/** Keyboard mappings use event.key, so both AZERTY and QWERTY work as expected. */
export const CONTROL_ACTIONS = [
  'moveUp', 'moveLeft', 'moveDown', 'moveRight',
  'dash', 'fireNova', 'iceBlast',
] as const;
export type ControlAction = typeof CONTROL_ACTIONS[number];
export type KeyBindings = Record<ControlAction, string[]>;

export const CONTROL_LABELS: Record<ControlAction, string> = {
  moveUp: 'Omhoog', moveLeft: 'Links', moveDown: 'Omlaag', moveRight: 'Rechts',
  dash: 'Dash', fireNova: 'Fire Nova', iceBlast: 'Ice Blast',
};

export function defaultKeyBindings(): KeyBindings {
  return {
    moveUp: ['W', 'Z'],
    moveLeft: ['A', 'Q'],
    moveDown: ['S'],
    moveRight: ['D'],
    dash: ['1'],
    fireNova: ['2'],
    iceBlast: ['3'],
  };
}

/** Only safe, non-modifier keys may be mapped. Escape cancels the capture UI. */
export function normalizeBindKey(key: string): string | null {
  const normalized = key === ' ' ? 'SPACE' : key.toUpperCase();
  if (/^[A-Z0-9]$/.test(normalized)) return normalized;
  if (['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'SPACE'].includes(normalized)) {
    return normalized;
  }
  return null;
}

export function validateKeyBindings(raw: unknown): KeyBindings {
  const defaults = defaultKeyBindings();
  if (!raw || typeof raw !== 'object') return defaults;
  const input = raw as Record<string, unknown>;
  const result = defaultKeyBindings();
  const occupied = new Set<string>();
  for (const action of CONTROL_ACTIONS) {
    const saved = input[action];
    if (!Array.isArray(saved) || saved.length < 1 || saved.length > 2 ||
      !saved.every(item => typeof item === 'string' && normalizeBindKey(item) === item) ||
      new Set(saved).size !== saved.length || saved.some(item => occupied.has(item))) {
      result[action] = [...defaults[action]];
    } else {
      result[action] = [...saved];
    }
    for (const key of result[action]) occupied.add(key);
  }
  // Invalid/tampered saves should never create overlapping controls.
  if (occupied.size !== CONTROL_ACTIONS.reduce((count, action) => count + result[action].length, 0)) {
    return defaults;
  }
  return result;
}

export type RebindResult =
  | { ok: true; bindings: KeyBindings }
  | { ok: false; reason: 'invalid' | 'conflict'; action?: ControlAction };

/** A customized control replaces its default aliases; other controls stay untouched. */
export function rebindKey(bindings: Readonly<KeyBindings>, action: ControlAction, input: string): RebindResult {
  const key = normalizeBindKey(input);
  if (!key) return { ok: false, reason: 'invalid' };
  for (const other of CONTROL_ACTIONS) {
    if (other !== action && bindings[other].includes(key)) {
      return { ok: false, reason: 'conflict', action: other };
    }
  }
  return {
    ok: true,
    bindings: { ...bindings, [action]: [key] },
  };
}

export function formatBinding(keys: readonly string[]): string {
  return keys.map(key => ({
    ARROWUP: '↑', ARROWDOWN: '↓', ARROWLEFT: '←', ARROWRIGHT: '→',
    SPACE: 'SPATIE',
  })[key] ?? key).join(' / ');
}

export function keyboardVector(held: ReadonlySet<string>, bindings: Readonly<KeyBindings>): { x: number; y: number } {
  const down = (action: ControlAction) => bindings[action].some(key => held.has(key));
  const x = Number(down('moveRight')) - Number(down('moveLeft'));
  const y = Number(down('moveDown')) - Number(down('moveUp'));
  const magnitude = Math.hypot(x, y);
  return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
}

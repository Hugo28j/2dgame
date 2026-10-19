/** Saved physical actions; keyboard and mouse buttons share one conflict-free mapping. */
export const CONTROL_ACTIONS = [
  'moveUp', 'moveLeft', 'moveDown', 'moveRight',
  'shoot', 'dash', 'fireNova', 'iceBlast',
] as const;
export type ControlAction = typeof CONTROL_ACTIONS[number];
export type KeyBindings = Record<ControlAction, string[]>;

export const CONTROL_LABELS: Record<ControlAction, string> = {
  moveUp: 'Omhoog', moveLeft: 'Links', moveDown: 'Omlaag', moveRight: 'Rechts',
  shoot: 'Vuren', dash: 'Dash', fireNova: 'Fire Nova', iceBlast: 'Ice Blast',
};

export function defaultKeyBindings(): KeyBindings {
  return {
    moveUp: ['W', 'Z'], moveLeft: ['A', 'Q'],
    moveDown: ['S'], moveRight: ['D'], shoot: ['MOUSE1'],
    dash: ['1'], fireNova: ['2'], iceBlast: ['3'],
  };
}

export function mouseButtonKey(button: number): string | null {
  // Browser: 0=left, 1=middle, 2=right, 3=back, 4=forward.
  // Game UI: mouse 1=left, 2=right, 3=middle, 4=back, 5=forward.
  const names = ['MOUSE1', 'MOUSE3', 'MOUSE2', 'MOUSE4', 'MOUSE5'];
  return Number.isInteger(button) && button >= 0 && button < names.length
    ? names[button]! : null;
}

/** Canonical, supported input tokens. Escape cancels capture and is never bound. */
export function normalizeBindKey(key: string): string | null {
  const normalized = key === ' ' ? 'SPACE' : key.toUpperCase();
  if (/^[A-Z0-9]$/.test(normalized)) return normalized;
  if (['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'SPACE',
    'MOUSE1', 'MOUSE2', 'MOUSE3', 'MOUSE4', 'MOUSE5'].includes(normalized)) return normalized;
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
  // A malformed or outdated save must not cause one button to trigger two actions.
  const count = CONTROL_ACTIONS.reduce((n, action) => n + result[action].length, 0);
  return count === occupied.size ? result : defaults;
}

export type RebindResult =
  | { ok: true; bindings: KeyBindings }
  | { ok: false; reason: 'invalid' | 'conflict'; action?: ControlAction };

export function rebindKey(bindings: Readonly<KeyBindings>, action: ControlAction, input: string): RebindResult {
  const key = normalizeBindKey(input);
  if (!key) return { ok: false, reason: 'invalid' };
  for (const other of CONTROL_ACTIONS) {
    if (other !== action && bindings[other].includes(key)) {
      return { ok: false, reason: 'conflict', action: other };
    }
  }
  return { ok: true, bindings: { ...bindings, [action]: [key] } };
}

export function formatBinding(keys: readonly string[]): string {
  return keys.map(key => ({
    ARROWUP: '↑', ARROWDOWN: '↓', ARROWLEFT: '←', ARROWRIGHT: '→',
    SPACE: 'SPATIE', MOUSE1: 'MUIS 1', MOUSE2: 'MUIS 2', MOUSE3: 'MUIS 3',
    MOUSE4: 'MUIS 4', MOUSE5: 'MUIS 5',
  })[key] ?? key).join(' / ');
}

export function keyboardVector(held: ReadonlySet<string>, bindings: Readonly<KeyBindings>): { x: number; y: number } {
  const down = (action: ControlAction) => bindings[action].some(key => held.has(key));
  const x = Number(down('moveRight')) - Number(down('moveLeft'));
  const y = Number(down('moveDown')) - Number(down('moveUp'));
  const magnitude = Math.hypot(x, y);
  return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
}

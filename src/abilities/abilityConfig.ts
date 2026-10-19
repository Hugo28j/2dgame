export type AbilityId = 'dash' | 'fire-nova' | 'ice-blast';

export interface AbilityConfig {
  readonly id: AbilityId;
  readonly name: string;
  readonly symbol: string;
  readonly color: number;
  readonly cooldownMs: number;
  readonly radius: number;
  readonly damage: number;
  readonly durationMs: number;
  readonly available: boolean;
  readonly icon: string;
}

export const ABILITY_SLOTS: readonly AbilityId[] = ['dash', 'fire-nova', 'ice-blast'];

export const ABILITIES: Readonly<Record<AbilityId, AbilityConfig>> = {
  dash: {
    id: 'dash', name: 'Dash', symbol: '➜', color: 0x38bdf8,
    cooldownMs: 4800, radius: 0, damage: 0, durationMs: 200,
    available: true, icon: 'dash',
  },
  'fire-nova': {
    id: 'fire-nova', name: 'Fire Nova', symbol: '✹', color: 0xfb923c,
    cooldownMs: 8500, radius: 115, damage: 40, durationMs: 320,
    available: true, icon: 'fire-nova',
  },
  'ice-blast': {
    id: 'ice-blast', name: 'Ice Blast', symbol: '❄', color: 0x67e8f9,
    cooldownMs: 11000, radius: 145, damage: 23, durationMs: 3000,
    available: true, icon: 'ice-blast',
  },
} as const;

export const DASH_SPEED = 720;
export const DASH_IFRAME_MS = 140;
export const ICE_SLOW_FACTOR = 0.45;

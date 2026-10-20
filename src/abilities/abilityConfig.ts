import type { HeroId } from '../heroes/heroConfig';

export type AbilityId =
  | 'guardian-charge' | 'guardian-slam' | 'guardian-aegis'
  | 'ranger-step' | 'ranger-rain' | 'ranger-volley'
  | 'mage-blink' | 'mage-burst' | 'mage-timewarp'
  | 'frost-dash' | 'frost-ring' | 'frost-blizzard'
  | 'pyro-dash' | 'pyro-nova' | 'pyro-inferno'
  | 'storm-step' | 'storm-pulse' | 'storm-tempest'
  | 'void-rift' | 'void-collapse' | 'void-drain';
export type AbilityKind = 'dash' | 'area' | 'slow' | 'heal' | 'drain';

export interface AbilityConfig {
  readonly id: AbilityId;
  readonly heroId: HeroId;
  readonly slot: 1 | 2 | 3;
  readonly unlockLevel: 1 | 10 | 20;
  readonly kind: AbilityKind;
  readonly name: string;
  readonly description: string;
  readonly symbol: string;
  readonly color: number;
  readonly cooldownMs: number;
  readonly radius: number;
  readonly damage: number;
  readonly heal: number;
  readonly durationMs: number;
  readonly dashSpeed: number;
  readonly invulnerabilityMs: number;
  readonly slowFactor: number;
}

const ability = (config: AbilityConfig): AbilityConfig => config;
export const ABILITIES: Readonly<Record<AbilityId, AbilityConfig>> = {
  'guardian-charge': ability({ id: 'guardian-charge', heroId: 'guardian', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Shield Charge', description: 'Beschermde stormloop', symbol: '➜', color: 0xfbbf24,
    cooldownMs: 5200, radius: 0, damage: 0, heal: 0, durationMs: 240, dashSpeed: 650,
    invulnerabilityMs: 190, slowFactor: 1 }),
  'guardian-slam': ability({ id: 'guardian-slam', heroId: 'guardian', slot: 2, unlockLevel: 10,
    kind: 'area', name: 'Ground Slam', description: 'Zware slag rondom je', symbol: '✦', color: 0xf59e0b,
    cooldownMs: 9000, radius: 105, damage: 58, heal: 0, durationMs: 320, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),
  'guardian-aegis': ability({ id: 'guardian-aegis', heroId: 'guardian', slot: 3, unlockLevel: 20,
    kind: 'heal', name: 'Aegis Sanctuary', description: 'Herstel HP en word beschermd', symbol: '⬟', color: 0xfde68a,
    cooldownMs: 18000, radius: 65, damage: 0, heal: 42, durationMs: 1100, dashSpeed: 0,
    invulnerabilityMs: 1100, slowFactor: 1 }),

  'ranger-step': ability({ id: 'ranger-step', heroId: 'ranger', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Windstep', description: 'Snelle ontwijkende sprong', symbol: '➜', color: 0x38bdf8,
    cooldownMs: 4300, radius: 0, damage: 0, heal: 0, durationMs: 190, dashSpeed: 780,
    invulnerabilityMs: 125, slowFactor: 1 }),
  'ranger-rain': ability({ id: 'ranger-rain', heroId: 'ranger', slot: 2, unlockLevel: 10,
    kind: 'area', name: 'Arrow Rain', description: 'Pijlenregen in een groot gebied', symbol: '⇊', color: 0x7dd3fc,
    cooldownMs: 8200, radius: 130, damage: 44, heal: 0, durationMs: 360, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),
  'ranger-volley': ability({ id: 'ranger-volley', heroId: 'ranger', slot: 3, unlockLevel: 20,
    kind: 'area', name: 'Predator Volley', description: 'Kritieke aanval rondom je', symbol: '✣', color: 0x22d3ee,
    cooldownMs: 13500, radius: 175, damage: 86, heal: 0, durationMs: 430, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),

  'mage-blink': ability({ id: 'mage-blink', heroId: 'mage', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Arcane Blink', description: 'Teleportachtige magische dash', symbol: '◇', color: 0xc084fc,
    cooldownMs: 4700, radius: 0, damage: 0, heal: 0, durationMs: 150, dashSpeed: 900,
    invulnerabilityMs: 150, slowFactor: 1 }),
  'mage-burst': ability({ id: 'mage-burst', heroId: 'mage', slot: 2, unlockLevel: 10,
    kind: 'area', name: 'Arcane Burst', description: 'Magische explosie', symbol: '✹', color: 0xd8b4fe,
    cooldownMs: 7600, radius: 120, damage: 56, heal: 0, durationMs: 330, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),
  'mage-timewarp': ability({ id: 'mage-timewarp', heroId: 'mage', slot: 3, unlockLevel: 20,
    kind: 'slow', name: 'Time Warp', description: 'Vertraagt een enorme zone', symbol: '◴', color: 0xa78bfa,
    cooldownMs: 15000, radius: 190, damage: 38, heal: 0, durationMs: 5200, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 0.28 }),

  'frost-dash': ability({ id: 'frost-dash', heroId: 'frostblade', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Ice Lunge', description: 'Snelle ijzige uitval', symbol: '➜', color: 0x7dd3fc,
    cooldownMs: 4500, radius: 0, damage: 0, heal: 0, durationMs: 190, dashSpeed: 820,
    invulnerabilityMs: 135, slowFactor: 1 }),
  'frost-ring': ability({ id: 'frost-ring', heroId: 'frostblade', slot: 2, unlockLevel: 10,
    kind: 'slow', name: 'Frozen Ring', description: 'Beschadigt en vertraagt', symbol: '❄', color: 0x67e8f9,
    cooldownMs: 8500, radius: 120, damage: 48, heal: 0, durationMs: 3200, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 0.4 }),
  'frost-blizzard': ability({ id: 'frost-blizzard', heroId: 'frostblade', slot: 3, unlockLevel: 20,
    kind: 'slow', name: 'Whiteout', description: 'Verwoestende bevriezende storm', symbol: '✻', color: 0xbae6fd,
    cooldownMs: 15500, radius: 180, damage: 92, heal: 0, durationMs: 4500, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 0.22 }),

  'pyro-dash': ability({ id: 'pyro-dash', heroId: 'pyromancer', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Flame Rush', description: 'Vurige ontsnappingsdash', symbol: '➜', color: 0xfb923c,
    cooldownMs: 5000, radius: 0, damage: 0, heal: 0, durationMs: 200, dashSpeed: 750,
    invulnerabilityMs: 145, slowFactor: 1 }),
  'pyro-nova': ability({ id: 'pyro-nova', heroId: 'pyromancer', slot: 2, unlockLevel: 10,
    kind: 'area', name: 'Fire Nova', description: 'Brandende cirkelvormige aanval', symbol: '✹', color: 0xf97316,
    cooldownMs: 7800, radius: 125, damage: 65, heal: 0, durationMs: 340, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),
  'pyro-inferno': ability({ id: 'pyro-inferno', heroId: 'pyromancer', slot: 3, unlockLevel: 20,
    kind: 'area', name: 'Inferno', description: 'Massale vuuruitbarsting', symbol: '☀', color: 0xef4444,
    cooldownMs: 16000, radius: 185, damage: 118, heal: 0, durationMs: 520, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),

  'storm-step': ability({ id: 'storm-step', heroId: 'stormstrider', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Lightning Step', description: 'Bliksemsnelle verplaatsing', symbol: 'ϟ', color: 0xfde047,
    cooldownMs: 3800, radius: 0, damage: 0, heal: 0, durationMs: 175, dashSpeed: 940,
    invulnerabilityMs: 120, slowFactor: 1 }),
  'storm-pulse': ability({ id: 'storm-pulse', heroId: 'stormstrider', slot: 2, unlockLevel: 10,
    kind: 'area', name: 'Thunder Pulse', description: 'Elektrische schokgolf', symbol: 'ϟ', color: 0xfacc15,
    cooldownMs: 7000, radius: 135, damage: 52, heal: 0, durationMs: 300, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),
  'storm-tempest': ability({ id: 'storm-tempest', heroId: 'stormstrider', slot: 3, unlockLevel: 20,
    kind: 'area', name: 'Eye of the Storm', description: 'Gigantische bliksemstorm', symbol: '☈', color: 0xfef08a,
    cooldownMs: 13200, radius: 200, damage: 94, heal: 0, durationMs: 500, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),

  'void-rift': ability({ id: 'void-rift', heroId: 'voidwalker', slot: 1, unlockLevel: 1,
    kind: 'dash', name: 'Rift Walk', description: 'Verdwijn kort in de leegte', symbol: '◈', color: 0xc084fc,
    cooldownMs: 4400, radius: 0, damage: 0, heal: 0, durationMs: 180, dashSpeed: 860,
    invulnerabilityMs: 180, slowFactor: 1 }),
  'void-collapse': ability({ id: 'void-collapse', heroId: 'voidwalker', slot: 2, unlockLevel: 10,
    kind: 'slow', name: 'Void Collapse', description: 'Treft en vertraagt nabije vijanden', symbol: '◎', color: 0xa855f7,
    cooldownMs: 8200, radius: 145, damage: 61, heal: 0, durationMs: 2800, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 0.48 }),
  'void-drain': ability({ id: 'void-drain', heroId: 'voidwalker', slot: 3, unlockLevel: 20,
    kind: 'drain', name: 'Soul Drain', description: 'Steel leven van alle nabije vijanden', symbol: '☾', color: 0xe879f9,
    cooldownMs: 17000, radius: 170, damage: 82, heal: 28, durationMs: 480, dashSpeed: 0,
    invulnerabilityMs: 0, slowFactor: 1 }),
};

export const ABILITY_IDS = Object.keys(ABILITIES) as AbilityId[];
export const HERO_ABILITIES: Readonly<Record<HeroId, readonly [AbilityId, AbilityId, AbilityId]>> = {
  guardian: ['guardian-charge', 'guardian-slam', 'guardian-aegis'],
  ranger: ['ranger-step', 'ranger-rain', 'ranger-volley'],
  mage: ['mage-blink', 'mage-burst', 'mage-timewarp'],
  frostblade: ['frost-dash', 'frost-ring', 'frost-blizzard'],
  pyromancer: ['pyro-dash', 'pyro-nova', 'pyro-inferno'],
  stormstrider: ['storm-step', 'storm-pulse', 'storm-tempest'],
  voidwalker: ['void-rift', 'void-collapse', 'void-drain'],
};
/** Compatibility alias for systems that need exactly three active buttons. */
export const ABILITY_SLOTS = HERO_ABILITIES.guardian;
export const MAX_ABILITY_LEVEL = 20;

export interface AbilityStats extends AbilityConfig { readonly upgradeLevel: number }
export function abilityUpgradeCost(level: number): number {
  return 40 + Math.max(0, level - 1) * 35;
}
export function getAbilityStats(id: AbilityId, level: number): AbilityStats {
  const base = ABILITIES[id];
  const extra = Math.max(0, Math.min(MAX_ABILITY_LEVEL, Math.floor(level)) - 1);
  const cooldownScale = Math.max(0.7, 1 - extra * 0.015);
  return {
    ...base, upgradeLevel: extra + 1,
    damage: Math.round(base.damage * (1 + extra * 0.12)),
    heal: Math.round(base.heal * (1 + extra * 0.1)),
    radius: Math.round(base.radius * (1 + extra * 0.012)),
    cooldownMs: Math.round(base.cooldownMs * cooldownScale),
    dashSpeed: Math.round(base.dashSpeed * (1 + extra * 0.012)),
  };
}

export function isAbilityUnlocked(id: AbilityId, heroLevel: number): boolean {
  return heroLevel >= ABILITIES[id].unlockLevel;
}

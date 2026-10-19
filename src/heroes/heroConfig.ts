export type HeroId = 'ranger' | 'mage' | 'guardian';

export interface HeroStats {
  maxHp: number;
  damage: number;
  attackSpeed: number;
  movementSpeed: number;
  criticalChance: number;
  criticalMultiplier: number;
  defense: number;
  abilityCooldownModifier: number;
  abilityDamageMultiplier: number;
}
export interface HeroConfig {
  id: HeroId;
  name: string;
  description: string;
  passive: string;
  textureKey: string;
  color: number;
  unlockCost: number;
  stats: Readonly<HeroStats>;
}
export const HEROES: Readonly<Record<HeroId, HeroConfig>> = {
  ranger: {
    id: 'ranger', name: 'Ranger', description: 'Snelle, precieze jager',
    passive: '+15% aanvalssnelheid', textureKey: 'hero-ranger',
    color: 0x38bdf8, unlockCost: 0,
    stats: { maxHp: 100, damage: 4, attackSpeed: 1.15, movementSpeed: 230,
      criticalChance: 0.12, criticalMultiplier: 1.8, defense: 8,
      abilityCooldownModifier: 1, abilityDamageMultiplier: 1 },
  },
  mage: {
    id: 'mage', name: 'Mage', description: 'Meester van magische projectielen',
    passive: '+20% magische wapenschade', textureKey: 'hero-mage',
    color: 0xc084fc, unlockCost: 100,
    stats: { maxHp: 85, damage: 9, attackSpeed: 1, movementSpeed: 205,
      criticalChance: 0.1, criticalMultiplier: 1.75, defense: 4,
      abilityCooldownModifier: 0.9, abilityDamageMultiplier: 1.2 },
  },
  guardian: {
    id: 'guardian', name: 'Guardian', description: 'Gepantserde beschermer',
    passive: 'Extra HP en verdediging', textureKey: 'hero-guardian',
    color: 0xfbbf24, unlockCost: 120,
    stats: { maxHp: 145, damage: 2, attackSpeed: 0.92, movementSpeed: 170,
      criticalChance: 0.08, criticalMultiplier: 1.65, defense: 22,
      abilityCooldownModifier: 1.05, abilityDamageMultiplier: 1 },
  },
};
export const HERO_IDS = Object.keys(HEROES) as HeroId[];
export const MAX_HERO_LEVEL = 20;
export function heroUpgradeCost(level: number): number {
  return 35 + Math.max(0, level - 1) * 30;
}
export function getHeroStats(id: HeroId, level: number): HeroStats {
  const base = HEROES[id].stats;
  const extra = Math.max(0, Math.min(MAX_HERO_LEVEL, Math.floor(level)) - 1);
  return {
    ...base,
    maxHp: Math.round(base.maxHp + extra * 8),
    damage: Math.round((base.damage + extra * 1.5) * 10) / 10,
    defense: Math.round((base.defense + extra * 1.2) * 10) / 10,
  };
}

export type WeaponId = 'bow' | 'crossbow' | 'staff' | 'daggers' | 'lightning';
export type WeaponEffect = 'none' | 'magic' | 'chain-lightning';
export interface WeaponConfig {
  id: WeaponId;
  name: string;
  description: string;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  projectileCount: number;
  piercing: number;
  criticalChanceModifier: number;
  criticalMultiplier: number;
  specialEffects: readonly string[];
  upgradeLevel: number;
  unlockCost: number;
  projectileRange: number;
  effect: WeaponEffect;
  textureKey: string;
}
export const WEAPONS: Readonly<Record<WeaponId, WeaponConfig>> = {
  bow: {
    id: 'bow', name: 'Ascent Bow', description: 'Betrouwbaar en gebalanceerd',
    damage: 24, fireRate: 3.5, projectileSpeed: 470,
    projectileCount: 1, piercing: 0, criticalChanceModifier: 0.05,
    criticalMultiplier: 1.75, specialEffects: [], upgradeLevel: 1,
    unlockCost: 0, projectileRange: 700, effect: 'none', textureKey: 'arrow-placeholder',
  },
  crossbow: {
    id: 'crossbow', name: 'Iron Crossbow', description: 'Zwaar schot dat doorboort',
    damage: 45, fireRate: 1.5, projectileSpeed: 590,
    projectileCount: 1, piercing: 1, criticalChanceModifier: 0.02,
    criticalMultiplier: 1.8, specialEffects: ['pierce'], upgradeLevel: 1,
    unlockCost: 60, projectileRange: 750, effect: 'none', textureKey: 'bolt-projectile',
  },
  staff: {
    id: 'staff', name: 'Arcane Staff', description: 'Magische bollen met extra kracht',
    damage: 30, fireRate: 2.5, projectileSpeed: 350,
    projectileCount: 1, piercing: 0, criticalChanceModifier: 0.04,
    criticalMultiplier: 1.8, specialEffects: ['magic'], upgradeLevel: 1,
    unlockCost: 80, projectileRange: 670, effect: 'magic', textureKey: 'magic-projectile',
  },
  daggers: {
    id: 'daggers', name: 'Twin Daggers', description: 'Twee snelle messen, kort bereik',
    damage: 12, fireRate: 5, projectileSpeed: 540,
    projectileCount: 2, piercing: 0, criticalChanceModifier: 0.08,
    criticalMultiplier: 1.7, specialEffects: ['spread'], upgradeLevel: 1,
    unlockCost: 95, projectileRange: 250, effect: 'none', textureKey: 'dagger-projectile',
  },
  lightning: {
    id: 'lightning', name: 'Lightning Wand', description: 'Elektriciteit springt naar andere Slimes',
    damage: 26, fireRate: 2.1, projectileSpeed: 430,
    projectileCount: 1, piercing: 0, criticalChanceModifier: 0.04,
    criticalMultiplier: 1.8, specialEffects: ['chain-lightning'], upgradeLevel: 1,
    unlockCost: 120, projectileRange: 670,
    effect: 'chain-lightning', textureKey: 'lightning-projectile',
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const BOW_CONFIG = WEAPONS.bow;
export const MAX_WEAPON_LEVEL = 20;
export function weaponUpgradeCost(level: number): number {
  return 30 + Math.max(0, level - 1) * 25;
}
export function fireIntervalMs(fireRate: number): number {
  if (fireRate <= 0) throw new Error('Fire rate must be greater than zero.');
  return 1000 / fireRate;
}
export function getWeaponStats(id: WeaponId, level: number): WeaponConfig {
  const base = WEAPONS[id];
  const extra = Math.max(0, Math.min(MAX_WEAPON_LEVEL, Math.floor(level)) - 1);
  return {
    ...base,
    upgradeLevel: extra + 1,
    damage: Math.round(base.damage * (1 + 0.12 * extra) * 10) / 10,
    fireRate: Math.round(base.fireRate * (1 + 0.02 * extra) * 100) / 100,
  };
}

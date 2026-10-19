export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  projectileCount: number;
  piercing: number;
  criticalChanceModifier: number;
  criticalMultiplier: number;
  specialEffects: readonly string[];
  upgradeLevel: number;
}

export const BOW_CONFIG: Readonly<WeaponConfig> = Object.freeze({
  id: 'bow',
  name: 'Ascent Bow',
  damage: 24,
  fireRate: 3.5,
  projectileSpeed: 470,
  projectileCount: 1,
  piercing: 0,
  criticalChanceModifier: 0.05,
  criticalMultiplier: 1.75,
  specialEffects: [],
  upgradeLevel: 1,
});

export const fireIntervalMs = (fireRate: number): number => {
  if (fireRate <= 0) {
    throw new Error('Fire rate must be greater than zero.');
  }

  return 1000 / fireRate;
};

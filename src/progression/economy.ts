export const PERMANENT_UPGRADE_IDS = ['hp', 'damage', 'defense', 'weaponDamage', 'weaponSpeed'] as const;
export type PermanentUpgradeId = typeof PERMANENT_UPGRADE_IDS[number];
export type PermanentLevels = Record<PermanentUpgradeId, number>;
export const MAX_PERMANENT_LEVEL = 15;

export const PERMANENT_UPGRADES: Readonly<Record<PermanentUpgradeId, {
  name: string; description: string; baseCost: number;
}>> = {
  hp: { name: 'Hero HP', description: '+8 maximum HP per niveau', baseCost: 45 },
  damage: { name: 'Hero Damage', description: '+1.5 damage per niveau', baseCost: 55 },
  defense: { name: 'Hero Defense', description: '+1.2 defense per niveau', baseCost: 40 },
  weaponDamage: { name: 'Wapen Damage', description: '+2 schade per niveau', baseCost: 60 },
  weaponSpeed: { name: 'Wapen Snelheid', description: '+2% fire rate per niveau', baseCost: 65 },
};
export function defaultPermanentLevels(): PermanentLevels {
  return { hp: 0, damage: 0, defense: 0, weaponDamage: 0, weaponSpeed: 0 };
}
export function permanentUpgradeCost(id: PermanentUpgradeId, level: number): number {
  const safe = Math.max(0, Math.min(MAX_PERMANENT_LEVEL, Math.floor(level)));
  return Math.round(PERMANENT_UPGRADES[id].baseCost * 1.38 ** safe);
}
export function permanentBonuses(levels: Readonly<PermanentLevels>) {
  return {
    hp: levels.hp * 8,
    damage: levels.damage * 1.5,
    defense: levels.defense * 1.2,
    weaponDamage: levels.weaponDamage * 2,
    weaponSpeed: 1 + levels.weaponSpeed * 0.02,
  };
}

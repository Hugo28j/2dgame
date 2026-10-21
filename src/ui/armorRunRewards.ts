import { armorDefinition, RARITY_CONFIG, validArmorItem, type ArmorItem } from '../progression/armor';

export interface ArmorRunReward {
  readonly name: string;
  readonly symbol: string;
  readonly rarity: string;
  readonly color: string;
}

/** Present only real armor pickups supplied by the completed run. */
export function armorRunRewards(collected: readonly ArmorItem[]): ArmorRunReward[] {
  return collected.filter(validArmorItem).map(item => {
    const definition = armorDefinition(item);
    return {
      name: definition.name,
      symbol: definition.symbol,
      rarity: RARITY_CONFIG[item.rarity].label,
      color: '#' + RARITY_CONFIG[item.rarity].color.toString(16).padStart(6, '0'),
    };
  });
}

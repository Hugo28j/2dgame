import { ARMOR_DEFINITIONS, ARMOR_RARITIES, type ArmorItem, type ArmorRarity } from '../progression/armor';
import { HERO_IDS, type HeroId } from '../heroes/heroConfig';

/** All purchases use EARNED, NON-TRANSFERABLE game gold, never real money. */
export type ChestSize = 'small' | 'medium' | 'large';
export interface ShopChest {
  readonly id: ChestSize;
  readonly name: string;
  readonly caption: string;
  readonly tier: string;
  readonly color: number;
  readonly trim: number;
  readonly scale: number;
  readonly cost: number;
  /** Exact percentage chance; sum = 100. Shown to the player before purchase. */
  readonly odds: Readonly<Record<ArmorRarity, number>>;
}
export const SHOP_CHESTS: readonly ShopChest[] = [
  { id: 'small', name: 'REIZIGERSKIST', caption: 'Houten reiskist', tier: 'KLEIN',
    color: 0x704324, trim: 0xd6a46b, scale: .72, cost: 100,
    odds: { common: 55, uncommon: 26, rare: 12, epic: 6, legendary: 1 } },
  { id: 'medium', name: 'MYSTIEKE KIST', caption: 'Zilver en magische runen', tier: 'MIDDEL',
    color: 0x2b526c, trim: 0x9de9ff, scale: .88, cost: 350,
    odds: { common: 30, uncommon: 35, rare: 22, epic: 10, legendary: 3 } },
  { id: 'large', name: 'KONINGSKIST', caption: 'Goud en koninklijke edelstenen', tier: 'GROOT',
    color: 0x703750, trim: 0xffd66e, scale: 1.04, cost: 950,
    odds: { common: 12, uncommon: 25, rare: 30, epic: 23, legendary: 10 } },
] as const;
export function getShopChest(id: ChestSize): ShopChest | undefined {
  return SHOP_CHESTS.find(chest => chest.id === id);
}
export type ChestRoll = Readonly<{
  rarity: number;
  hero: number;
  kind: number;
}>;
const validRoll = (roll: number): boolean =>
  Number.isFinite(roll) && roll >= 0 && roll < 1;
export function chestEligibleHeroes(owned: readonly HeroId[]): HeroId[] {
  return HERO_IDS.filter(hero => owned.includes(hero));
}
export function chestRarity(chest: ShopChest, roll: number): ArmorRarity | null {
  if (!validRoll(roll)) return null;
  let remaining = roll * 100;
  for (const rarity of ARMOR_RARITIES) {
    remaining -= chest.odds[rarity];
    if (remaining < 0) return rarity;
  }
  return ARMOR_RARITIES[ARMOR_RARITIES.length - 1];
}

/** Chests drop only hero-specific armor for heroes ALREADY unlocked.
 * All nine equipment designs have equal probability within the rolled rarity.
 * Companion drops deliberately absent until that system is built. */
export function rollChestArmor(chest: ShopChest, unlocked: readonly HeroId[],
  rolls: ChestRoll, itemId: string): ArmorItem | null {
  if (![rolls.rarity, rolls.hero, rolls.kind].every(validRoll) ||
      !/^chest-[a-zA-Z0-9-]{8,110}$/.test(itemId)) return null;
  const heroes = chestEligibleHeroes(unlocked);
  const rarity = chestRarity(chest, rolls.rarity);
  if (!heroes.length || !rarity) return null;
  const heroId = heroes[Math.floor(rolls.hero * heroes.length)]!;
  const catalog = ARMOR_DEFINITIONS.filter(item => item.heroId === heroId);
  if (!catalog.length) return null;
  return {
    id: itemId, kind: catalog[Math.floor(rolls.kind * catalog.length)]!.kind,
    heroId, rarity, level: 1, stars: 0,
  };
}

/** Display samples do not affect the real reward or probabilities. */
export function previewChestArmor(chest: ShopChest, unlocked: readonly HeroId[],
  random: () => number, itemId: string): ArmorItem | null {
  return rollChestArmor(chest, unlocked, {
    rarity: random(), hero: random(), kind: random(),
  }, itemId);
}

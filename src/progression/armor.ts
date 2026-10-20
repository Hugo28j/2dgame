import { HERO_IDS, type HeroId } from '../heroes/heroConfig';
/** Armor is hero-specific equipment. All stat boosts are fractions of baseline stats. */
export const ARMOR_SLOTS = ['helm', 'body', 'boots'] as const;
export type ArmorSlot = typeof ARMOR_SLOTS[number];
export const ARMOR_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type ArmorRarity = typeof ARMOR_RARITIES[number];
export const ARMOR_MAX_LEVEL = 30;
export const ARMOR_MAX_STARS = 5;
export interface ArmorItem {
  id: string;
  kind: string;
  heroId: HeroId;
  rarity: ArmorRarity;
  level: number;
  stars: number;
}
export interface ArmorDefinition {
  kind: string;
  heroId: HeroId;
  slot: ArmorSlot;
  name: string;
  symbol: string;
  /** Coefficients for primary and secondary attributes. */
  hp: number; defense: number; weaponDamage: number;
  attackSpeed: number; movementSpeed: number;
}
const ARMOR_TEMPLATES: readonly Omit<ArmorDefinition, 'heroId'>[] = [
  { kind: 'vanguard-helm', slot: 'helm', name: 'Vanguard Helm', symbol: '♜', hp: .035, defense: 0, weaponDamage: .025, attackSpeed: 0, movementSpeed: 0 },
  { kind: 'hunter-hood', slot: 'helm', name: 'Hunter Hood', symbol: '♞', hp: .025, defense: 0, weaponDamage: .04, attackSpeed: 0, movementSpeed: 0 },
  { kind: 'sage-crown', slot: 'helm', name: 'Sage Crown', symbol: '♛', hp: .045, defense: 0, weaponDamage: .018, attackSpeed: 0, movementSpeed: 0 },
  { kind: 'bulwark-plate', slot: 'body', name: 'Bulwark Plate', symbol: '◆', hp: .028, defense: .085, weaponDamage: 0, attackSpeed: 0, movementSpeed: 0 },
  { kind: 'iron-vest', slot: 'body', name: 'Iron Vest', symbol: '⬟', hp: .05, defense: .065, weaponDamage: 0, attackSpeed: 0, movementSpeed: 0 },
  { kind: 'warden-mail', slot: 'body', name: 'Warden Mail', symbol: '◇', hp: .038, defense: .075, weaponDamage: 0, attackSpeed: 0, movementSpeed: 0 },
  { kind: 'wind-boots', slot: 'boots', name: 'Wind Boots', symbol: '➟', hp: 0, defense: 0, weaponDamage: 0, attackSpeed: .025, movementSpeed: .045 },
  { kind: 'swift-greaves', slot: 'boots', name: 'Swift Greaves', symbol: '↝', hp: 0, defense: 0, weaponDamage: 0, attackSpeed: .04, movementSpeed: .025 },
  { kind: 'runner-treads', slot: 'boots', name: 'Runner Treads', symbol: '➤', hp: 0, defense: 0, weaponDamage: 0, attackSpeed: .032, movementSpeed: .035 },
];
/** Each hero owns nine themed armor variants, three per slot. */
export const ARMOR_DEFINITIONS: readonly ArmorDefinition[] = HERO_IDS.flatMap(heroId =>
  ARMOR_TEMPLATES.map(template => ({
    ...template, heroId, kind: heroId + '-' + template.kind,
    name: heroId.charAt(0).toUpperCase() + heroId.slice(1) + ' ' + template.name,
  })));
export const RARITY_CONFIG: Readonly<Record<ArmorRarity, {
  label: string; weight: number; multiplier: number; sell: number; color: number;
}>> = {
  common: { label: 'Common', weight: 55, multiplier: 1, sell: 100, color: 0x94a3b8 },
  uncommon: { label: 'Uncommon', weight: 26, multiplier: 1.5, sell: 250, color: 0x4ade80 },
  rare: { label: 'Rare', weight: 12, multiplier: 2.1, sell: 500, color: 0x38bdf8 },
  epic: { label: 'Epic', weight: 6, multiplier: 3, sell: 1000, color: 0xc084fc },
  legendary: { label: 'Legendary', weight: 1, multiplier: 4.1, sell: 2000, color: 0xfbbf24 },
};
export const armorDefinition = (item: ArmorItem): ArmorDefinition =>
  ARMOR_DEFINITIONS.find(x => x.kind === item.kind)!;

export function validArmorItem(raw: unknown): raw is ArmorItem {
  if (!raw || typeof raw !== 'object') return false;
  const item = raw as Partial<ArmorItem>;
  return typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 120 &&
    HERO_IDS.includes(item.heroId as HeroId) &&
    ARMOR_DEFINITIONS.some(x => x.kind === item.kind && x.heroId === item.heroId) &&
    ARMOR_RARITIES.includes(item.rarity as ArmorRarity) &&
    Number.isInteger(item.level) && item.level! >= 1 && item.level! <= ARMOR_MAX_LEVEL &&
    Number.isInteger(item.stars) && item.stars! >= 0 && item.stars! <= ARMOR_MAX_STARS;
}

export function rollArmor(victory: boolean, dropRoll: number, rarityRoll: number,
  kindRoll: number, runId: string, heroId: HeroId = 'guardian',
  index = 0): ArmorItem | undefined {
  if (![dropRoll, rarityRoll, kindRoll].every(n => Number.isFinite(n) && n >= 0 && n < 1)) return;
  // Primary: guaranteed on victory / 40% on defeat. Secondary: 20% / 10%.
  if (dropRoll >= (index === 0 ? (victory ? 1 : .4) : (victory ? .2 : .1))) return;
  let remaining = rarityRoll * 100;
  let rarity: ArmorRarity = 'common';
  for (const choice of ARMOR_RARITIES) {
    remaining -= RARITY_CONFIG[choice].weight;
    if (remaining < 0) { rarity = choice; break; }
  }
  const catalog = ARMOR_DEFINITIONS.filter(x => x.heroId === heroId);
  return {
    id: 'armor-' + runId + '-' + index, heroId,
    kind: catalog[Math.floor(kindRoll * catalog.length)]!.kind,
    rarity, level: 1, stars: 0,
  };
}

export interface ArmorRoll { drop: number; rarity: number; kind: number }
export function rollArmorRewards(victory: boolean, runId: string, heroId: HeroId,
  rolls: readonly [ArmorRoll, ArmorRoll]): ArmorItem[] {
  return rolls.flatMap((roll, index) => {
    const item = rollArmor(victory, roll.drop, roll.rarity, roll.kind, runId, heroId, index);
    return item ? [item] : [];
  });
}
export function armorUpgradeCost(item: ArmorItem): number {
  return Math.round((30 + item.level * 20) * RARITY_CONFIG[item.rarity].multiplier);
}
export function armorBonuses(items: readonly ArmorItem[], equipped: Readonly<Record<ArmorSlot, string | null>>, heroId?: HeroId) {
  const totals = { hp: 0, defense: 0, weaponDamage: 0, attackSpeed: 0, movementSpeed: 0 };
  for (const slot of ARMOR_SLOTS) {
    const item = items.find(x => x.id === equipped[slot] && armorDefinition(x).slot === slot && (!heroId || x.heroId === heroId));
    if (!item) continue;
    const definition = armorDefinition(item);
    const factor = RARITY_CONFIG[item.rarity].multiplier *
      (1 + .035 * (item.level - 1)) * (1 + item.stars * .18);
    for (const stat of Object.keys(totals) as (keyof typeof totals)[])
      totals[stat] += definition[stat] * factor;
  }
  return totals;
}
export function armorStatText(item: ArmorItem): string {
  const d = armorDefinition(item);
  const bonuses = armorBonuses([item], { helm: d.slot === 'helm' ? item.id : null,
    body: d.slot === 'body' ? item.id : null, boots: d.slot === 'boots' ? item.id : null });
  return (Object.entries(bonuses) as [keyof typeof bonuses, number][])
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ hp: 'HP', defense: 'DEF', weaponDamage: 'WPN DMG',
      attackSpeed: 'SHOOT SPEED', movementSpeed: 'WALK SPEED' })[key] +
      ' +' + (value * 100).toFixed(1) + '%').join('  ·  ');
}

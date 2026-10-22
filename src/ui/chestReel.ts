import type { HeroId } from '../heroes/heroConfig';
import type { ArmorItem } from '../progression/armor';
import { previewChestArmor, type ShopChest } from './shopCatalog';

/** A moving belt has items both ABOVE and BELOW the chosen reward when it stops.
 * The already-purchased reward determines the stop; other entries are purely
 * visual samples, drawn with the same rarity odds and unlocked-hero restrictions. */
export interface ChestReelPlan {
  readonly items: readonly ArmorItem[];
  readonly winnerIndex: number;
}

export function planChestReel(chest: ShopChest, unlockedHeroes: readonly HeroId[],
  reward: ArmorItem, random: () => number, before = 34, after = 14): ChestReelPlan {
  // At least three neighbours remain visible on either side of the winner,
  // so it never appears as a terminal "last item" at the end of the band.
  const preceding = Math.max(4, Math.min(80, Math.floor(before)));
  const following = Math.max(4, Math.min(80, Math.floor(after)));
  const sample = (position: number) => previewChestArmor(chest, unlockedHeroes, random,
    'chest-reel-preview-' + position);
  const precedingItems = Array.from({ length: preceding }, (_, i) => sample(i));
  const followingItems = Array.from({ length: following },
    (_, i) => sample(preceding + 1 + i));
  // If an item cannot be previewed, prefer the won item to blank slots.
  const items = [...precedingItems, reward, ...followingItems].map(x => x ?? reward);
  return { items, winnerIndex: preceding };
}

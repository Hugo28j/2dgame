import type { ArmorItem } from '../progression/armor';

export const EQUIPMENT_VISIBLE_ROWS = 3;

/** Continuous inventory position in rows (not numbered pages). */
export function inventoryMaxOffset(itemCount: number, visibleRows = EQUIPMENT_VISIBLE_ROWS): number {
  return Math.max(0, itemCount - visibleRows);
}

export function moveInventoryOffset(
  offset: number, delta: number, itemCount: number, visibleRows = EQUIPMENT_VISIBLE_ROWS,
): number {
  const max = inventoryMaxOffset(itemCount, visibleRows);
  return Math.max(0, Math.min(max, Math.round(offset) + Math.round(delta)));
}

/** Fusion needs an identical piece of the same hero, rarity and star tier. */
export function canFuseArmor(item: ArmorItem, inventory: readonly ArmorItem[], maxStars: number): boolean {
  return item.stars < maxStars && inventory.some(other =>
    other.id !== item.id && other.heroId === item.heroId && other.kind === item.kind &&
    other.rarity === item.rarity && other.stars === item.stars);
}

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

/** A row can open only after its own pointer-down, not a release from the overview. */
export function isInventoryRowTap(
  pressedId: string | null, rowId: string,
  start: { x: number; y: number } | null, release: { x: number; y: number },
  tolerance = 14,
): boolean {
  return pressedId === rowId && start !== null &&
    Math.abs(release.x - start.x) <= tolerance &&
    Math.abs(release.y - start.y) <= tolerance;
}

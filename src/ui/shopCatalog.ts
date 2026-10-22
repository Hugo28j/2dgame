/** Display-only chest offers. Purchases and rewards are intentionally not implemented. */
export type ChestSize = 'small' | 'medium' | 'large';
export interface ShopChest {
  readonly id: ChestSize;
  readonly name: string;
  readonly caption: string;
  readonly tier: string;
  readonly color: number;
  readonly trim: number;
  readonly scale: number;
  readonly available: false;
}
export const SHOP_CHESTS: readonly ShopChest[] = [
  { id: 'small', name: 'REIZIGERSKIST', caption: 'Houten reiskist', tier: 'KLEIN',
    color: 0x704324, trim: 0xd6a46b, scale: .72, available: false },
  { id: 'medium', name: 'MYSTIEKE KIST', caption: 'Zilver en magische runen', tier: 'MIDDEL',
    color: 0x2b526c, trim: 0x9de9ff, scale: .88, available: false },
  { id: 'large', name: 'KONINGSKIST', caption: 'Goud en koninklijke edelstenen', tier: 'GROOT',
    color: 0x703750, trim: 0xffd66e, scale: 1.04, available: false },
] as const;

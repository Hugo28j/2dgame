import { describe, expect, it } from 'vitest';
import { SHOP_CHESTS } from '../src/ui/shopCatalog';

describe('shop preview catalog', () => {
  it('has three distinct small, medium and large chests', () => {
    expect(SHOP_CHESTS.map(chest => chest.id)).toEqual(['small', 'medium', 'large']);
    expect(new Set(SHOP_CHESTS.map(chest => chest.name)).size).toBe(3);
    expect(SHOP_CHESTS[0]!.scale).toBeLessThan(SHOP_CHESTS[1]!.scale);
    expect(SHOP_CHESTS[1]!.scale).toBeLessThan(SHOP_CHESTS[2]!.scale);
  });
  it('never exposes a price, purchase or reward action yet', () => {
    expect(SHOP_CHESTS.every(chest => chest.available === false)).toBe(true);
    for (const chest of SHOP_CHESTS) {
      expect(Object.keys(chest)).not.toContain('cost');
      expect(Object.keys(chest)).not.toContain('reward');
      expect(Object.keys(chest)).not.toContain('action');
    }
  });
});

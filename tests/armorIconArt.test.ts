import { describe, expect, it } from 'vitest';
import { HERO_IDS } from '../src/heroes/heroConfig';
import { ARMOR_DEFINITIONS, ARMOR_RARITIES, type ArmorItem } from '../src/progression/armor';
import { ARMOR_ICON_SIZE, armorIconLook } from '../src/ui/armorIconArt';

function itemFor(kind: string, heroId: ArmorItem['heroId'], rarity: ArmorItem['rarity']): ArmorItem {
  return { id: kind + '-' + rarity, heroId, kind, rarity, stars: 0, level: 1 };
}

describe('unique themed armor icons', () => {
  it('supports all 63 gear designs with all five rarity variants (315 combinations)', () => {
    const icons = ARMOR_DEFINITIONS.flatMap(definition =>
      ARMOR_RARITIES.map(rarity => armorIconLook(itemFor(definition.kind, definition.heroId, rarity))));
    expect(ARMOR_ICON_SIZE).toBe(96);
    expect(icons).toHaveLength(315);
    expect(new Set(icons.map(icon => icon.key)).size).toBe(315);
    for (const icon of icons) {
      expect(icon.slot).toMatch(/^(helm|body|boots)$/);
      expect(icon.key).toContain(icon.heroId);
      expect(icon.variant).toBeGreaterThanOrEqual(0);
      expect(icon.variant).toBeLessThanOrEqual(2);
      expect(icon.rarityColor).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('uses nine visually distinct templates per hero and a different theme for each hero', () => {
    const themes = new Set<string>();
    for (const heroId of HERO_IDS) {
      const looks = ARMOR_DEFINITIONS.filter(x => x.heroId === heroId)
        .map(definition => armorIconLook(itemFor(definition.kind, heroId, 'common')));
      expect(looks).toHaveLength(9);
      expect(looks.filter(x => x.slot === 'helm').map(x => x.variant).sort()).toEqual([0,1,2]);
      expect(looks.filter(x => x.slot === 'body').map(x => x.variant).sort()).toEqual([0,1,2]);
      expect(looks.filter(x => x.slot === 'boots').map(x => x.variant).sort()).toEqual([0,1,2]);
      expect(new Set(looks.map(x => x.theme)).size).toBe(1);
      themes.add(looks[0]!.theme);
    }
    expect(themes.size).toBe(HERO_IDS.length);
  });

  it('increases ornaments with rarity and does not change stats or IDs on upgrades', () => {
    const definition = ARMOR_DEFINITIONS[0]!;
    const ornaments = ARMOR_RARITIES.map(rarity =>
      armorIconLook(itemFor(definition.kind, definition.heroId, rarity)).decorationCount);
    expect(ornaments).toEqual([0,1,2,3,4]);
    const initial = itemFor(definition.kind, definition.heroId, 'epic');
    const leveled: ArmorItem = { ...initial, level: 30, stars: 5 };
    expect(armorIconLook(leveled).key).toBe(armorIconLook(initial).key);
  });
});

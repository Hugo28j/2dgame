import { describe, expect, it } from 'vitest';
import { HERO_IDS } from '../src/heroes/heroConfig';
import { HERO_WEAPONS } from '../src/weapons/weaponConfig';
import { HERO_ABILITIES, getAbilityStats } from '../src/abilities/abilityConfig';
import { abilityMenuSummary, equipmentForHero } from '../src/ui/menuPresentation';

describe('clean menu loadout navigation', () => {
  it('shows only the current hero and two relevant weapons in equipment upgrades', () => {
    for (const hero of HERO_IDS) {
      const equipment = equipmentForHero(hero);
      expect(equipment.heroId).toBe(hero);
      expect(equipment.weaponIds).toEqual(HERO_WEAPONS[hero]);
      expect(equipment.weaponIds).toHaveLength(2);
    }
  });

  it('labels utility skills with their actual effect, not zero damage or zero range', () => {
    expect(abilityMenuSummary(getAbilityStats('guardian-charge', 1)))
      .toContain('50 SHIELD HP');
    expect(abilityMenuSummary(getAbilityStats('guardian-charge', 1)))
      .toContain('30.0S CD');
    expect(abilityMenuSummary(getAbilityStats('mage-blink', 1)))
      .toContain('TELEPORT 170');
    expect(abilityMenuSummary(getAbilityStats('mage-timewarp', 1)))
      .toContain('SLOW MOTION');
    expect(abilityMenuSummary(getAbilityStats('ranger-volley', 1)))
      .toContain('1.20× AANVALSSNELHEID');
  });

  it('shows relevant combat metrics for every hero ability', () => {
    for (const hero of HERO_IDS) {
      for (const id of HERO_ABILITIES[hero]) {
        const summary = abilityMenuSummary(getAbilityStats(id, 1));
        expect(summary.length).toBeGreaterThan(8);
        expect(summary).not.toMatch(/^0 DMG\b/);
        expect(summary).not.toContain('R0');
      }
    }
  });
});

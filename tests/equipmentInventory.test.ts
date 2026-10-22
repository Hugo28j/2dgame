import { describe, expect, it } from 'vitest';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';
import { rollEnemyArmor, ARMOR_MAX_STARS } from '../src/progression/armor';
import { canFuseArmor, inventoryMaxOffset, moveInventoryOffset } from '../src/ui/equipmentInventory';

describe('unified equipment inventory helpers', () => {
  it('scrolls through every item without switching pages', () => {
    expect(inventoryMaxOffset(0)).toBe(0);
    expect(inventoryMaxOffset(3)).toBe(0);
    expect(inventoryMaxOffset(24)).toBe(21);
    expect(moveInventoryOffset(0, 1, 24)).toBe(1);
    expect(moveInventoryOffset(1, 7, 24)).toBe(8);
    expect(moveInventoryOffset(21, 10, 24)).toBe(21);
    expect(moveInventoryOffset(0, -9, 24)).toBe(0);
    expect(moveInventoryOffset(21, 0, 1)).toBe(0);
  });

  it('only enables fusion for exact duplicates below maximum stars', () => {
    const first = rollEnemyArmor('normal', 0, 0, 0, 'run', 'a', 'guardian')!;
    const second = rollEnemyArmor('normal', 0, 0, 0, 'run', 'b', 'guardian')!;
    const anotherHero = { ...second, id: 'other', heroId: 'ranger' as const };
    expect(canFuseArmor(first, [first], ARMOR_MAX_STARS)).toBe(false);
    expect(canFuseArmor(first, [first, anotherHero], ARMOR_MAX_STARS)).toBe(false);
    expect(canFuseArmor(first, [first, second], ARMOR_MAX_STARS)).toBe(true);
    expect(canFuseArmor({ ...first, stars: ARMOR_MAX_STARS }, [first, second], ARMOR_MAX_STARS)).toBe(false);
  });

  it('keeps equipped items and upgrades intact when selected from inventory', () => {
    const piece = rollEnemyArmor('normal', 0, 0, 0, 'run', 'a', 'guardian')!;
    let profile = { ...defaultProfile(), gold: 10000, armorInventory: [piece] };
    profile = applyProfileAction(profile, { type: 'equipArmor', id: piece.id });
    expect(profile.equippedArmor.guardian.helm).toBe(piece.id);
    profile = applyProfileAction(profile, { type: 'upgradeArmor', id: piece.id });
    expect(profile.armorInventory[0]?.level).toBe(2);
    expect(profile.equippedArmor.guardian.helm).toBe(piece.id);
  });
});

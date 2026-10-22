import { describe, expect, it } from 'vitest';
import { advanceUpgradeIntent, sameUpgradeIntent } from '../src/ui/upgradeConfirmation';
import { getWeaponStats, weaponUpgradeCost, MAX_WEAPON_LEVEL } from '../src/weapons/weaponConfig';
import { armorBonuses, armorUpgradeCost, rollEnemyArmor } from '../src/progression/armor';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';

describe('two-step upgrade confirmation', () => {
  const weapon = { type: 'upgradeWeapon' as const, id: 'bow' };
  it('does not spend or change the level on the preview tap', () => {
    const initial = { ...defaultProfile(), gold: 1000, unlockedWeapons: ['sunblade', 'bow'] as
      ReturnType<typeof defaultProfile>['unlockedWeapons'] };
    const first = advanceUpgradeIntent(null, weapon, initial.weaponLevels.bow);
    expect(first.shouldApply).toBe(false);
    const afterPreview = first.shouldApply
      ? applyProfileAction(initial, { type: 'upgradeWeapon', id: 'bow' }) : initial;
    expect(afterPreview.gold).toBe(initial.gold);
    expect(afterPreview.weaponLevels.bow).toBe(1);
    expect(first.pending).toEqual({ ...weapon, level: 1 });
    expect(weaponUpgradeCost(1)).toBe(30);
  });

  it('only confirms a matching item, action and unchanged level', () => {
    const first = advanceUpgradeIntent(null, weapon, 1);
    expect(sameUpgradeIntent(first.pending, weapon, 1)).toBe(true);
    expect(sameUpgradeIntent(first.pending, { ...weapon, id: 'crossbow' }, 1)).toBe(false);
    expect(sameUpgradeIntent(first.pending, { ...weapon, type: 'upgradeAbility' }, 1)).toBe(false);
    expect(sameUpgradeIntent(first.pending, weapon, 2)).toBe(false);
    expect(advanceUpgradeIntent(first.pending, weapon, 1))
      .toEqual({ shouldApply: true, pending: null });
    expect(advanceUpgradeIntent(first.pending, weapon, 2))
      .toEqual({ shouldApply: false, pending: { ...weapon, level: 2 } });
  });

  it('uses exact next-level weapon stats for preview, including projectile milestones', () => {
    const bow19 = getWeaponStats('bow', 19), bow20 = getWeaponStats('bow', 20);
    expect(bow19.projectileCount).toBe(1);
    expect(bow20.projectileCount).toBe(2);
    expect(bow20.damage).toBeGreaterThan(bow19.damage);
    expect(getWeaponStats('bow', MAX_WEAPON_LEVEL).upgradeLevel).toBe(MAX_WEAPON_LEVEL);
  });

  it('uses the same armor multipliers as the live profile for next-level previews', () => {
    const piece = rollEnemyArmor('normal', 0, 0, 0, 'run', 'one', 'guardian')!;
    const equipped = { helm: piece.id, body: null, boots: null };
    const before = armorBonuses([piece], equipped, 'guardian');
    const after = armorBonuses([{ ...piece, level: piece.level + 1 }], equipped, 'guardian');
    expect(after.hp).toBeGreaterThan(before.hp);
    expect(armorUpgradeCost(piece)).toBe(50);
    expect(advanceUpgradeIntent(null, { type: 'upgradeArmor', id: piece.id }, 1).shouldApply)
      .toBe(false);
  });
});

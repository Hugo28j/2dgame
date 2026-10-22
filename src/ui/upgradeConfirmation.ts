/** A single deliberate second tap is required before spending upgrade gold. */
export type UpgradeType = 'upgradeArmor' | 'upgradeWeapon' | 'upgradeAbility';
export interface UpgradeIntent { type: UpgradeType; id: string; level: number }

export function sameUpgradeIntent(
  pending: UpgradeIntent | null,
  action: Pick<UpgradeIntent, 'type' | 'id'>,
  currentLevel: number,
): boolean {
  return pending !== null && pending.type === action.type &&
    pending.id === action.id && pending.level === currentLevel;
}

/** First tap previews; only a matching second tap confirms. */
export function advanceUpgradeIntent(
  pending: UpgradeIntent | null,
  action: Pick<UpgradeIntent, 'type' | 'id'>,
  currentLevel: number,
): { shouldApply: boolean; pending: UpgradeIntent | null } {
  if (sameUpgradeIntent(pending, action, currentLevel)) {
    return { shouldApply: true, pending: null };
  }
  return { shouldApply: false, pending: { ...action, level: currentLevel } };
}

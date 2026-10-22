import type { WeaponId } from '../weapons/weaponConfig';

/** Pure attack-pose selection and timing: no Phaser or browser dependencies. */
export type AttackPose = 'sword' | 'hammer' | 'bow' | 'crossbow' | 'shotgun' |
  'staff' | 'spellbook' | 'ice-dagger' | 'ice-wave';

export const poseForWeapon = (weapon: WeaponId): AttackPose | null =>
  weapon === 'sunblade' ? 'sword' : weapon === 'warhammer' ? 'hammer'
    : weapon === 'bow' ? 'bow' : weapon === 'crossbow' ? 'crossbow'
      : weapon === 'staff' ? 'staff' : weapon === 'spellbook' ? 'spellbook'
        : weapon === 'daggers' ? 'ice-dagger' : weapon === 'iceblade' ? 'ice-wave' : null;

export function poseLengthMs(pose: AttackPose, attackIntervalMs: number): number {
  const base = pose === 'hammer' ? 440 : pose === 'sword' ? 200 :
    pose === 'staff' ? 285 : pose === 'spellbook' ? 250 : pose === 'ice-wave' ? 380 :
      pose === 'ice-dagger' ? 165 : pose === 'crossbow' ? 175 :
        pose === 'shotgun' ? 210 : 145;
  return pose === 'hammer' ? Math.max(220, Math.min(base, attackIntervalMs * .78))
    : Math.max(75, Math.min(base, attackIntervalMs * .78));
}

export function attackPoseProgress(now: number, started: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(now)) return 1;
  return Math.max(0, Math.min(1, (now - started) / duration));
}

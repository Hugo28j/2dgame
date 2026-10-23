import type { WeaponId } from '../weapons/weaponConfig';

/** Pure attack-pose selection and timing: no Phaser or browser dependencies. */
export type AttackPose = 'sword' | 'hammer' | 'bow' | 'crossbow' | 'shotgun' |
  'staff' | 'spellbook' | 'ice-dagger' | 'ice-wave' |
  'ember-staff' | 'flamethrower' | 'storm-wand' | 'storm-lance' |
  'abyss-orb' | 'shadow-scythe';

export const poseForWeapon = (weapon: WeaponId): AttackPose | null =>
  weapon === 'sunblade' ? 'sword' : weapon === 'warhammer' ? 'hammer'
    : weapon === 'bow' ? 'bow' : weapon === 'crossbow' ? 'crossbow'
      : weapon === 'staff' ? 'staff' : weapon === 'spellbook' ? 'spellbook'
        : weapon === 'daggers' ? 'ice-dagger' : weapon === 'iceblade' ? 'ice-wave'
          : weapon === 'emberstaff' ? 'ember-staff' : weapon === 'fireorbs' ? 'flamethrower'
            : weapon === 'lightning' ? 'storm-wand' : weapon === 'stormlance' ? 'storm-lance'
              : weapon === 'voidorb' ? 'abyss-orb' : weapon === 'shadowscythe' ? 'shadow-scythe'
                : null;

export function poseLengthMs(pose: AttackPose, attackIntervalMs: number): number {
  if (pose === 'bow') return Math.max(90, Math.min(220, attackIntervalMs * .9));
  if (pose === 'crossbow') return Math.max(180, Math.min(560, attackIntervalMs * .9));
  const base = pose === 'hammer' ? 440 : pose === 'sword' ? 200 :
    pose === 'staff' ? 285 : pose === 'spellbook' ? 250 : pose === 'ice-wave' ? 380 :
      pose === 'ember-staff' ? 330 : pose === 'flamethrower' ? 240 :
        pose === 'storm-wand' ? 220 : pose === 'storm-lance' ? 310 :
          pose === 'abyss-orb' ? 360 : pose === 'shadow-scythe' ? 460 :
            pose === 'ice-dagger' ? 165 :
              pose === 'shotgun' ? 210 : 145;
  return pose === 'hammer' ? Math.max(220, Math.min(base, attackIntervalMs * .78))
    : Math.max(75, Math.min(base, attackIntervalMs * .78));
}

export function attackPoseProgress(now: number, started: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(now)) return 1;
  return Math.max(0, Math.min(1, (now - started) / duration));
}

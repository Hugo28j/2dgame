/** Shared, deterministic timing for Ranger's weapon art and real projectile release. */
export const RANGER_WEAPON_ANIMATION = Object.freeze({
  bowNockEnds: .18,
  bowReleaseAt: .56,
  crossbowRecoilEnds: .14,
  crossbowCockEnds: .54,
  crossbowLoadEnds: .84,
});

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Arrow travels from the quiver hand to the string before the draw begins. */
export function bowNockProgress(progress: number): number {
  return clamp01(progress / RANGER_WEAPON_ANIMATION.bowNockEnds);
}

/** Zero while nocking, then a fast full draw up to the exact release frame. */
export function bowDrawAmount(progress: number): number {
  const { bowNockEnds, bowReleaseAt } = RANGER_WEAPON_ANIMATION;
  if (progress <= bowNockEnds || progress >= bowReleaseAt) return 0;
  return clamp01((progress - bowNockEnds) / (bowReleaseAt - bowNockEnds));
}

export function bowArrowIsHeld(progress: number): boolean {
  return progress < RANGER_WEAPON_ANIMATION.bowReleaseAt;
}

export type CrossbowReloadPhase = 'release' | 'cock' | 'load' | 'settle';

export function crossbowReloadPhase(progress: number): CrossbowReloadPhase {
  if (progress < RANGER_WEAPON_ANIMATION.crossbowRecoilEnds) return 'release';
  if (progress < RANGER_WEAPON_ANIMATION.crossbowCockEnds) return 'cock';
  if (progress < RANGER_WEAPON_ANIMATION.crossbowLoadEnds) return 'load';
  return 'settle';
}

/** String latch moves from the bow limbs back to the trigger lock. */
export function crossbowCockAmount(progress: number): number {
  const { crossbowRecoilEnds, crossbowCockEnds } = RANGER_WEAPON_ANIMATION;
  if (progress <= crossbowRecoilEnds) return 0;
  return clamp01((progress - crossbowRecoilEnds) / (crossbowCockEnds - crossbowRecoilEnds));
}

/** A fresh bolt moves from the reload hand onto the fully cocked rail. */
export function crossbowBoltLoadAmount(progress: number): number {
  const { crossbowCockEnds, crossbowLoadEnds } = RANGER_WEAPON_ANIMATION;
  if (progress <= crossbowCockEnds) return 0;
  return clamp01((progress - crossbowCockEnds) / (crossbowLoadEnds - crossbowCockEnds));
}

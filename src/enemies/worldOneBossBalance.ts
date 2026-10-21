/** World-one boss-specific tuning, separate from shared boss archetypes. */
export const MOSS_DASH = Object.freeze({
  warningMs: 165, // 50% shorter than the old 330ms warning
  phaseOneSpeed: 720, // +100% over the original 360px/s
  phaseTwoSpeed: 1080, // +200% over the original 360px/s
  phaseOneDurationMs: 810, // 1.5x the previous travel distance
  phaseTwoDurationMs: 540, // 1.5x the previous travel distance
  phaseOneRechargeMs: 2100,
  phaseTwoRechargeMs: 1250,
  trailSpacingMs: 160,
  trailFuseMs: 650,
  trailRadius: 37,
});
export const ROOT_BRANCH = Object.freeze({
  lineWarningMs: 500,
  burstWarningMs: 350,
  burstStaggerMs: 800,
  burstCount: 8,
  burstRotation: Math.PI / 8,
  pauseAfterBurstMs: 3000,
  lineRecoveryMs: 3000,
  lineWidth: 24,
  burstLength: 350,
});
export function rootBurstAngles(rotationIndex: number | boolean): number[] {
  const turn = typeof rotationIndex === 'boolean' ? Number(rotationIndex) : rotationIndex;
  return Array.from({ length: ROOT_BRANCH.burstCount }, (_, index) =>
    index * Math.PI * 2 / ROOT_BRANCH.burstCount + turn * ROOT_BRANCH.burstRotation);
}
export const SPORE_THROW_INTERVAL_MS = 1000;

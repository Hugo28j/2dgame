/** World-one boss-specific tuning, separate from shared boss archetypes. */
export const MOSS_DASH = Object.freeze({
  warningMs: 165, // 50% shorter than the old 330ms warning
  phaseOneSpeed: 720, // +100% over the original 360px/s
  phaseTwoSpeed: 1080, // +200% over the original 360px/s
  phaseOneDurationMs: 1215, // 1.5x the previous travel distance
  phaseTwoDurationMs: 810, // 1.5x the previous travel distance
  phaseOneRechargeMs: 2100,
  phaseTwoRechargeMs: 1250,
  trailBombCount: 20,
  trailFuseMs: 650,
  trailRadius: 37,
});
export const ROOT_BRANCH = Object.freeze({
  evadeDistance: 155,
  evadeSpeed: 460,
  evadeDurationMs: 260,
  evadeCooldownMs: 1650,
  spikeHitCooldownMs: 500,
  lineWarningMs: 360,
  strikeWarningMs: 150,
  strikeStaggerMs: 650,
  pauseAfterBurstMs: 3000,
  lineRecoveryMs: 3000,
  lineWidth: 38,
  armExtraReach: 125,
  leafDelayMs: 720,
  leafFallMs: 1050,
  leafPredictionMs: 900,
  leafExplosionRadius: 68,
  leafDamageFactor: .78,
});
export const SPORE_THROW_INTERVAL_MS = 1000;

/** Phaser Arcade uses axis-aligned bodies even for rotated sprites.
 * This collision box encloses a relatively narrow physical crystal core,
 * rather than the bright decorative bloom or the entire 48x22 texture. */
export const ICE_SPIKE = Object.freeze({
  textureWidth: 48,
  textureHeight: 22,
  coreLength: 29,
  coreThickness: 7,
  trailSampleMs: 42,
  maxTrailSamples: 5,
  trailLifetimeMs: 215,
});

export function iceSpikeCollisionSize(angle: number): { width: number; height: number } {
  const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
  return {
    width: Math.max(6, Math.ceil(ICE_SPIKE.coreLength * cos + ICE_SPIKE.coreThickness * sin)),
    height: Math.max(6, Math.ceil(ICE_SPIKE.coreLength * sin + ICE_SPIKE.coreThickness * cos)),
  };
}

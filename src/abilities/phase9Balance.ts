/** Phase 9 hero ability timing and hit geometry. No Phaser dependencies. */
export const SHOTGUN_TRANSFORM = Object.freeze({
  durationMs: 8000,
  cadenceMs: 1200,
  arrowsPerVolley: 7,
  spreadRadians: 0.13,
  projectileRange: 370,
  projectileSpeed: 510,
});
export const FROST_TIMEWARP = Object.freeze({
  durationAtLevel1Ms: 5000,
  durationAtLevel20Ms: 10000,
  cooldownAtLevel1Ms: 30000,
  cooldownAtLevel20Ms: 25000,
  enemyFactor: 0.5,
  projectileFactor: 0.5,
});
export const WHITEOUT_WAVE = Object.freeze({
  radius: 250,
  damage: 150,
  cooldownMs: 17000,
  expansionMs: 540,
  fadeMs: 430,
  knockbackMs: 490,
  knockbackSpeed: 540,
});
const normalizedLevel = (level: number): number =>
  Number.isFinite(level) ? Math.max(1, Math.min(20, Math.floor(level))) : 1;

export function frostSlowMotionDurationMs(level: number): number {
  return FROST_TIMEWARP.durationAtLevel1Ms +
    Math.round((normalizedLevel(level)-1) *
      (FROST_TIMEWARP.durationAtLevel20Ms - FROST_TIMEWARP.durationAtLevel1Ms)/19);
}
export function frostSlowMotionCooldownMs(level: number): number {
  return FROST_TIMEWARP.cooldownAtLevel1Ms -
    Math.round((normalizedLevel(level)-1) *
      (FROST_TIMEWARP.cooldownAtLevel1Ms - FROST_TIMEWARP.cooldownAtLevel20Ms)/19);
}
export function shotgunVolleyAngles(heading: number): number[] {
  return Array.from({length: SHOTGUN_TRANSFORM.arrowsPerVolley},(_,i)=>
    heading + (i - (SHOTGUN_TRANSFORM.arrowsPerVolley-1)/2) * SHOTGUN_TRANSFORM.spreadRadians);
}
export function whiteoutWaveRadius(progress: number, maxRadius: number = WHITEOUT_WAVE.radius): number {
  return maxRadius * Math.max(0,Math.min(1,progress));
}
/** Full visible dust-ring interior is damaging, not an unseen outside circle. */
export function whiteoutReaches(source: {x:number;y:number}, target:{x:number;y:number},
  radius:number, targetPadding=14): boolean {
  return Math.hypot(source.x-target.x,source.y-target.y) <= radius+targetPadding;
}

/** Explicit state machine for the World-1 room-20 Bramble Gunner transition. */
export type BrambleStage = 'idle' | 'wind' | 'growth' | 'explosion' | 'handoff';
export const BRAMBLE_CINEMATIC = Object.freeze({
  windMs: 1350,
  growthMs: 1580,
  explosionMs: 880,
  handoffMs: 380,
  heroPush: 235,
  gunnerGrowthScale: 3.25,
  sentinelHpMultiplier: 1.5,
  /** Two times the previous twin fire-rate multiplier (1.5x). */
  sentinelAttackRateMultiplier: 3,
  /** Twice the current clockwise/counterclockwise rotation per volley. */
  sentinelSpinMultiplier: 2,
});
const order: readonly BrambleStage[] = ['idle', 'wind', 'growth', 'explosion', 'handoff'];
export function nextBrambleStage(stage: BrambleStage): BrambleStage {
  return order[Math.min(order.length - 1, order.indexOf(stage) + 1)]!;
}
export function brambleDamageAllowed(stage: BrambleStage): boolean {
  return stage === 'idle';
}
/** Current spiral directions stay opposite; only their per-shot angle doubles. */
export function amplifiedTwinVolleyIndex(volley: number): number {
  return Math.max(0, Math.floor(volley)) * BRAMBLE_CINEMATIC.sentinelSpinMultiplier;
}
/** Clamp the wind's final, safe position inside the arena. */
export function brambleWindLanding(
  center: {x:number;y:number}, hero: {x:number;y:number},
  bounds: {x:number;y:number;width:number;height:number},
  push = BRAMBLE_CINEMATIC.heroPush,
): {x:number;y:number} {
  const dx = hero.x-center.x, dy = hero.y-center.y;
  const distance = Math.hypot(dx,dy);
  const ux = distance > 0.01 ? dx/distance : 1;
  const uy = distance > 0.01 ? dy/distance : 0;
  const padding = 36;
  return {
    x: Math.max(bounds.x+padding,Math.min(bounds.x+bounds.width-padding,hero.x+ux*push)),
    y: Math.max(bounds.y+padding,Math.min(bounds.y+bounds.height-padding,hero.y+uy*push)),
  };
}

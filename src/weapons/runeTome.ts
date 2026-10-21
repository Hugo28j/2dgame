/** Single Rune Tome orb: subtle steering before hit and ONE ricochet after it. */
export interface RunePoint { x: number; y: number }
export interface RuneEnemy extends RunePoint { enemyId: string }
export const RUNE_TOME = Object.freeze({
  initialAssistRadius: 315,
  // Less than 20 degrees of correction relative to the ORIGINAL firing angle.
  maxAimDeviation: Math.PI / 9,
  initialTurnRadiansPerSecond: 1.15,
  bounceSearchRadius: 230,
  bounceTurnRadiansPerSecond: 7.8,
  bounceMaxDurationMs: 920,
  bounceExtraRange: 260,
  maxTrailSamples: 9,
  trailSampleMs: 36,
  trailLifetimeMs: 240,
});

export function runeAngleDifference(from: number, to: number): number {
  return Math.atan2(Math.sin(to-from),Math.cos(to-from));
}

export function runeAimTarget(
  position: RunePoint, originalHeading: number, enemies: readonly RuneEnemy[],
): RuneEnemy | undefined {
  let best: RuneEnemy | undefined;
  let score = Infinity;
  for (const enemy of enemies) {
    const dx=enemy.x-position.x,dy=enemy.y-position.y;
    const distance=Math.hypot(dx,dy);
    if (distance<10 || distance>RUNE_TOME.initialAssistRadius) continue;
    const off=Math.abs(runeAngleDifference(originalHeading,Math.atan2(dy,dx)));
    if (off>RUNE_TOME.maxAimDeviation) continue;
    const candidateScore=off*440 + distance;
    if(candidateScore<score){best=enemy;score=candidateScore;}
  }
  return best;
}

/** Frame-rate-independent gradual correction with a strict original-cone clamp. */
export function runeSteer(
  currentHeading: number, desiredHeading: number, seconds: number,
  maxTurnRadiansPerSecond: number, originalHeading?: number,
): number {
  const maxTurn=Math.max(0,Math.min(0.05,seconds))*maxTurnRadiansPerSecond;
  const difference=runeAngleDifference(currentHeading,desiredHeading);
  let next=currentHeading+Math.max(-maxTurn,Math.min(maxTurn,difference));
  if(originalHeading!==undefined){
    const deviation=runeAngleDifference(originalHeading,next);
    next=originalHeading+Math.max(-RUNE_TOME.maxAimDeviation,
      Math.min(RUNE_TOME.maxAimDeviation,deviation));
  }
  return next;
}

/** One distinct, nearby target; no chain beyond that second enemy. */
export function runeBounceTarget(
  from: RunePoint, firstEnemyId: string, enemies: readonly RuneEnemy[],
): RuneEnemy | undefined {
  return enemies.filter(e=>e.enemyId!==firstEnemyId)
    .map(e=>({enemy:e,distance:Math.hypot(e.x-from.x,e.y-from.y)}))
    .filter(x=>x.distance<=RUNE_TOME.bounceSearchRadius && x.distance>1)
    .sort((a,b)=>a.distance-b.distance)[0]?.enemy;
}

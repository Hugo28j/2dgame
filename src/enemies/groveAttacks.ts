/** World 1 room-25/30 boss attacks. Geometry is deterministic and testable. */
export interface GrovePoint { readonly x: number; readonly y: number }
export interface GroveBounds { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface GroveBranchLane {
  readonly start: GrovePoint;
  readonly end: GrovePoint;
  readonly orientation: 'horizontal' | 'vertical';
}
export const JADE_BRANCH = Object.freeze({
  intervalMs: 1000,
  phaseTwoIntervalMs: 600,
  warningMs: 600,
  phaseTwoWarningMs: 400,
  growthMs: 780,
  activeMs: 5000,
  thickness: 26,
  hitCooldownMs: 760,
});
export const HEART_TREE = Object.freeze({
  warningExtraMs: 200,
  growthMs: 700,
  damageAtProgress: 0.64,
  holdMs: 1250,
  fadeMs: 240,
});

/** Two spaced full-arena corridors, with randomized height/width and direction. */
export function jadeBranchLanes(bounds: GroveBounds, random: () => number, forcedAxis?: 'horizontal' | 'vertical'): GroveBranchLane[] {
  const axis: 'horizontal' | 'vertical' = forcedAxis ?? (random() < 0.5 ? 'horizontal' : 'vertical');
  const horizontal = axis === 'horizontal';
  const along = horizontal ? bounds.height : bounds.width;
  const edge = 20;
  const offset = horizontal ? bounds.y : bounds.x;
  // Separate halves by at least 25% of their shared dimension.
  const fractions = [0.13 + random() * 0.23, 0.64 + random() * 0.23];
  return fractions.map(fraction => {
    const coordinate = offset + along * fraction;
    const reverse = random() < 0.5;
    const x0 = bounds.x + edge, x1 = bounds.x + bounds.width - edge;
    const y0 = bounds.y + edge, y1 = bounds.y + bounds.height - edge;
    return horizontal ? {
      orientation: axis,
      start: { x: reverse ? x1 : x0, y: coordinate },
      end: { x: reverse ? x0 : x1, y: coordinate },
    } : {
      orientation: axis,
      start: { x: coordinate, y: reverse ? y1 : y0 },
      end: { x: coordinate, y: reverse ? y0 : y1 },
    };
  });
}
export function groveBranchTip(lane: GroveBranchLane, t: number): GrovePoint {
  const progress = Math.max(0, Math.min(1, t));
  return {x: lane.start.x + (lane.end.x - lane.start.x) * progress,
    y: lane.start.y + (lane.end.y - lane.start.y) * progress};
}
/** Only the visibly-grown segment has a damaging hitbox. */
export function groveBranchHits(
  lane: GroveBranchLane, progress: number, point: GrovePoint,
  thickness = JADE_BRANCH.thickness,
): boolean {
  const tip = groveBranchTip(lane, progress);
  const dx = tip.x - lane.start.x, dy = tip.y - lane.start.y;
  const d2 = dx * dx + dy * dy;
  const t = d2 < 1e-5 ? 0 : Math.max(0, Math.min(1,
    ((point.x - lane.start.x) * dx + (point.y - lane.start.y) * dy) / d2));
  const cx = lane.start.x + dx * t;
  const cy = lane.start.y + dy * t;
  return Math.hypot(point.x-cx,point.y-cy) <= thickness / 2 + 9;
}
/** Shared circle predicate for the tree warning, canopy and damage footprint. */
export function groveTreeHits(
  center: GrovePoint, radius: number, player: GrovePoint,
): boolean {
  return Math.hypot(center.x-player.x,center.y-player.y) <= radius;
}

/** A short, movable lane can avoid both parallel and perpendicular existing lanes.
 * Reserve telegraphed lanes too: no later cast can overlap a pending one. */
export function jadeLaneOverlaps(a: GroveBranchLane, b: GroveBranchLane, padding = 34): boolean {
  const ax0 = Math.min(a.start.x,a.end.x)-padding, ax1 = Math.max(a.start.x,a.end.x)+padding;
  const ay0 = Math.min(a.start.y,a.end.y)-padding, ay1 = Math.max(a.start.y,a.end.y)+padding;
  const bx0 = Math.min(b.start.x,b.end.x)-padding, bx1 = Math.max(b.start.x,b.end.x)+padding;
  const by0 = Math.min(b.start.y,b.end.y)-padding, by1 = Math.max(b.start.y,b.end.y)+padding;
  return ax0 <= bx1 && ax1 >= bx0 && ay0 <= by1 && ay1 >= by0;
}
export function selectJadeLane(bounds: GroveBounds, axis: 'horizontal' | 'vertical',
  reserved: readonly GroveBranchLane[], random: () => number): GroveBranchLane | undefined {
  // Full wall-to-wall attacks. Positions are distributed along the OTHER axis,
  // but no active or telegraphed lane may intersect (including perpendicular lanes).
  const horizontal = axis === 'horizontal';
  const roomSpan = horizontal ? bounds.height : bounds.width;
  const edge = 28;
  const count = Math.max(1, Math.floor((roomSpan - 2*edge) / 42));
  const positions = Array.from({length: count}, (_, i) => (i + .5) / count);
  for (let i=positions.length-1; i>0; i--) {
    const j=Math.floor(random()*(i+1));
    [positions[i],positions[j]]=[positions[j]!,positions[i]!];
  }
  for (const fraction of positions) {
    const coord = (horizontal ? bounds.y : bounds.x) + edge + fraction! * (roomSpan-2*edge);
    const reverse = random()<.5;
    const x0=bounds.x+12,x1=bounds.x+bounds.width-12;
    const y0=bounds.y+12,y1=bounds.y+bounds.height-12;
    const lane: GroveBranchLane = horizontal ?
      {orientation:axis,start:{x:reverse?x1:x0,y:coord},end:{x:reverse?x0:x1,y:coord}} :
      {orientation:axis,start:{x:coord,y:reverse?y1:y0},end:{x:coord,y:reverse?y0:y1}};
    if (reserved.every(old=>!jadeLaneOverlaps(lane,old))) return lane;
  }
  return undefined;
}

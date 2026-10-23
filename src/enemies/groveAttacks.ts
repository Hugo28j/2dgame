/** World 1 room-25/30 boss attacks. Geometry is deterministic and testable. */
export interface GrovePoint { readonly x: number; readonly y: number }
export interface GroveBounds { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface GroveBranchLane {
  readonly start: GrovePoint;
  readonly end: GrovePoint;
  readonly orientation: 'horizontal' | 'vertical';
}
export const JADE_BRANCH = Object.freeze({
  intervalMs: 667,
  phaseTwoIntervalMs: 400,
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
  // Bounded attack strips allow both orientations to coexist without crossing.
  const horizontal = axis === 'horizontal';
  const margin = 35;
  const columns = 7, rows = 7;
  const spanX = bounds.width - margin * 2, spanY = bounds.height - margin * 2;
  const shuffled = Array.from({length:columns*rows},(_,i)=>i);
  for (let i=shuffled.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j]!,shuffled[i]!];
  }
  const length = horizontal ? Math.min(160,spanX/columns*2.1) :
    Math.min(160,spanY/rows*2.1);
  for(const cell of shuffled) {
    const col=cell%columns,row=Math.floor(cell/columns);
    const x=bounds.x+margin+(col+.5)*spanX/columns;
    const y=bounds.y+margin+(row+.5)*spanY/rows;
    const dx=horizontal ? length/2 : 0, dy=horizontal ? 0 : length/2;
    const reverse=random()<.5;
    const p={x:Math.max(bounds.x+12,x-dx),y:Math.max(bounds.y+12,y-dy)};
    const q={x:Math.min(bounds.x+bounds.width-12,x+dx),
      y:Math.min(bounds.y+bounds.height-12,y+dy)};
    const lane: GroveBranchLane={orientation:axis,start:reverse?q:p,end:reverse?p:q};
    if(reserved.every(old=>!jadeLaneOverlaps(lane,old)))return lane;
  }
  return undefined;
}

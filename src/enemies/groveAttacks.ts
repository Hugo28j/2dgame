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
  // Try a shuffled selection of short attack segments across all arena regions.
  const horizontal = axis === 'horizontal';
  const cellsX = 7, cellsY = 6;
  const order = Array.from({length:cellsX*cellsY},(_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j]!,order[i]!];}
  const margin=30, xspan=bounds.width-2*margin, yspan=bounds.height-2*margin;
  const length=(horizontal ? xspan/cellsX : yspan/cellsY)*2.05;
  for(const index of order){
    const column=index%cellsX, row=Math.floor(index/cellsX);
    const cx=bounds.x+margin+(column+.5)*xspan/cellsX;
    const cy=bounds.y+margin+(row+.5)*yspan/cellsY;
    const dx=horizontal ? length/2 : 0, dy=horizontal ? 0 : length/2;
    const lane: GroveBranchLane={orientation:axis,start:{x:Math.max(bounds.x+12,cx-dx),y:Math.max(bounds.y+12,cy-dy)},
      end:{x:Math.min(bounds.x+bounds.width-12,cx+dx),y:Math.min(bounds.y+bounds.height-12,cy+dy)}};
    if(reserved.every(existing=>!jadeLaneOverlaps(lane,existing))) return lane;
  }
  return undefined;
}

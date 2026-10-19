import { ARENA_BOUNDS } from '../config/gameplay';
import type { SpawnPoint } from '../enemies/EnemySpawner';

export const CHAPTER_ROOM_COUNT = 50;
export const BOSS_ROOM_INTERVAL = 5;
export const SAFE_SPAWN_DISTANCE = 140;

export interface ArenaRectangle {
  x: number; y: number; width: number; height: number;
}
export interface ObstacleDefinition {
  x: number; y: number; width: number; height: number;
}
export interface RoomLayout {
  id: string;
  bounds: ArenaRectangle;
  playerSpawn: SpawnPoint;
  enemySpawns: readonly SpawnPoint[];
  obstacles: readonly ObstacleDefinition[];
  accent: number;
}
export interface RoomDefinition {
  number: number;
  isBossRoom: boolean;
  enemyCount: number;
  layout: RoomLayout;
  enemySpawns: readonly SpawnPoint[];
}

export const ROOM_DIFFICULTY = Object.freeze({
  baseEnemyCount: 3,
  roomsPerExtraEnemy: 3,
  maxEnemyCount: 20,
  bossRoomBonusEnemies: 0,
});

/** Width and height never decrease; some chambers grow while others hold their size. */
export function getArenaBounds(roomNumber: number): ArenaRectangle {
  const room = Math.min(CHAPTER_ROOM_COUNT, Math.max(1, Math.floor(roomNumber)));
  return {
    x: ARENA_BOUNDS.x, y: ARENA_BOUNDS.y,
    width: ARENA_BOUNDS.width + Math.floor((room - 1) / 3) * 38,
    height: ARENA_BOUNDS.height + Math.floor((room - 1) / 2) * 44,
  };
}

type ObstacleStyle = readonly (readonly [number, number, number, number])[];
interface LayoutTemplate { id: string; accent: number; pieces: ObstacleStyle }
const TEMPLATES: readonly LayoutTemplate[] = [
  { id: 'open-court', accent: 0x38bdf8, pieces: [] },
  { id: 'twin-pillars', accent: 0x22d3ee, pieces: [[0.27, 0.43, 0.11, 0.19], [0.73, 0.43, 0.11, 0.19]] },
  { id: 'central-vault', accent: 0xa78bfa, pieces: [[0.5, 0.48, 0.19, 0.13]] },
  { id: 'split-lanes', accent: 0xfbbf24, pieces: [[0.24, 0.32, 0.11, 0.18], [0.76, 0.66, 0.11, 0.18]] },
  { id: 'broken-ruins', accent: 0xf97316, pieces: [[0.21, 0.38, 0.12, 0.13], [0.79, 0.4, 0.12, 0.13], [0.5, 0.65, 0.17, 0.09]] },
  { id: 'four-altars', accent: 0x84cc16, pieces: [[0.27, 0.32, 0.1, 0.10], [0.73, 0.32, 0.1, 0.10], [0.27, 0.65, 0.1, 0.10], [0.73, 0.65, 0.1, 0.10]] },
  { id: 'zigzag-gallery', accent: 0xfb7185, pieces: [[0.31, 0.34, 0.2, 0.08], [0.68, 0.55, 0.2, 0.08], [0.31, 0.72, 0.2, 0.08]] },
  { id: 'crystal-maze', accent: 0x67e8f9, pieces: [[0.22, 0.27, 0.1, 0.11], [0.79, 0.46, 0.1, 0.11], [0.45, 0.59, 0.11, 0.10], [0.75, 0.76, 0.10, 0.08]] },
  { id: 'staggered-court', accent: 0xc084fc, pieces: [[0.19, 0.50, 0.13, 0.18], [0.55, 0.35, 0.12, 0.1], [0.79, 0.63, 0.13, 0.13]] },
] as const;

const clamped = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

function obstaclesFor(bounds: ArenaRectangle, template: LayoutTemplate): ObstacleDefinition[] {
  return template.pieces.map(([fx, fy, fw, fh]) => ({
    x: bounds.x + bounds.width * fx,
    y: bounds.y + bounds.height * fy,
    width: clamped(bounds.width * fw, 32, 100),
    height: clamped(bounds.height * fh, 40, 140),
  }));
}

export function isSpawnSafe(point: SpawnPoint, layout: Pick<RoomLayout, 'bounds' | 'playerSpawn' | 'obstacles'>,
  playerDistance = SAFE_SPAWN_DISTANCE): boolean {
  const { bounds } = layout;
  if (point.x < bounds.x + 34 || point.x > bounds.x + bounds.width - 34 ||
    point.y < bounds.y + 38 || point.y > bounds.y + bounds.height - 34) return false;
  if (Math.hypot(point.x - layout.playerSpawn.x, point.y - layout.playerSpawn.y) < playerDistance) return false;
  return !layout.obstacles.some(o =>
    Math.abs(o.x - point.x) < o.width / 2 + 37 &&
    Math.abs(o.y - point.y) < o.height / 2 + 37);
}

function makeLayout(room: number, styleIndex: number): RoomLayout {
  const bounds = getArenaBounds(room);
  const template = TEMPLATES[styleIndex % TEMPLATES.length]!;
  const playerSpawn = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - 54 };
  const obstacles = obstaclesFor(bounds, template);
  const layout: RoomLayout = {
    id: template.id, bounds, playerSpawn, obstacles, enemySpawns: [], accent: template.accent,
  };
  // Across the whole arena instead of clustering all enemies on one screen.
  // Alternating columns/rows yields distributed spawns, even at room 50.
  const candidates: SpawnPoint[] = [];
  const columns = [0.13, 0.87, 0.31, 0.69, 0.5];
  const rows = [0.16, 0.37, 0.58, 0.76, 0.25, 0.48, 0.69];
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < columns.length; col++) {
      const fx = columns[(col + (room % columns.length)) % columns.length]!;
      const fy = rows[(row + Math.floor(room / 5)) % rows.length]!;
      const jitterX = (row % 2 ? 7 : -7) * (room % 3);
      const point = { x: bounds.x + bounds.width * fx + jitterX,
        y: bounds.y + bounds.height * fy };
      if (isSpawnSafe(point, layout) && candidates.every(previous =>
        Math.hypot(point.x - previous.x, point.y - previous.y) >= 56)) candidates.push(point);
    }
  }
  // Fill remaining slots using a deterministic grid. No enemy spawns in obstacles.
  if (candidates.length < ROOM_DIFFICULTY.maxEnemyCount) {
    for (let row = 1; row <= 12; row++) {
      for (let col = 1; col <= 8; col++) {
        const point = {
          x: bounds.x + bounds.width * col / 9,
          y: bounds.y + bounds.height * row / 14,
        };
        if (isSpawnSafe(point, layout) && candidates.every(previous =>
          Math.hypot(point.x - previous.x, point.y - previous.y) >= 56)) candidates.push(point);
      }
    }
  }
  return { ...layout, enemySpawns: candidates };
}

/** Exposed base versions for layout previews and regression tests. */
export const ROOM_LAYOUTS: readonly RoomLayout[] = TEMPLATES.map((_, i) => makeLayout(1, i));

export const getEnemyCountForRoom = (roomNumber: number): number => {
  const room = Math.max(1, Math.floor(roomNumber));
  return Math.min(ROOM_DIFFICULTY.maxEnemyCount,
    ROOM_DIFFICULTY.baseEnemyCount +
    Math.floor((room - 1) / ROOM_DIFFICULTY.roomsPerExtraEnemy));
};

export const getRoomDefinition = (roomNumber: number): RoomDefinition => {
  const room = Math.min(CHAPTER_ROOM_COUNT, Math.max(1, Math.floor(roomNumber)));
  const isBossRoom = room % BOSS_ROOM_INTERVAL === 0;
  const index = isBossRoom ? (Math.floor(room / 5) + 3) % TEMPLATES.length : (room - 1) % TEMPLATES.length;
  const layout = makeLayout(room, index);
  const enemyCount = isBossRoom ? 1 : getEnemyCountForRoom(room);
  // Bosses receive an open arena: mobility and projectile patterns remain fair.
  const bossLayout = isBossRoom ? makeLayout(room, 0) : layout;
  const bossSpawn = {
    x: bossLayout.bounds.x + bossLayout.bounds.width / 2,
    y: bossLayout.bounds.y + Math.min(190, bossLayout.bounds.height * 0.21),
  };
  return {
    number: room, isBossRoom, enemyCount,
    layout: bossLayout,
    enemySpawns: isBossRoom ? [bossSpawn] : layout.enemySpawns.slice(0, enemyCount),
  };
};

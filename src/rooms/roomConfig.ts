import { ARENA_BOUNDS } from '../config/gameplay';
import type { SpawnPoint } from '../enemies/EnemySpawner';
import type { WorldId } from '../worlds/worldConfig';

export const CHAPTER_ROOM_COUNT = 30;
export const BOSS_ROOM_INTERVAL = 5;
export const SAFE_SPAWN_DISTANCE = 140;

/** Keep late enemies well outside the player's starting viewport. */
export function getMinimumSpawnDistance(roomNumber: number): number {
  return Math.min(340, SAFE_SPAWN_DISTANCE + Math.floor((Math.max(1, roomNumber) - 1) / 5) * 25);
}

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
  roomsPerExtraEnemy: 2,
  maxEnemyCount: 32,
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
  // Each piece is an isolated island rather than a full wall across the arena.
  // This leaves paths for the player, chargers and boss projectile avoidance.
  { id: 'moonlit-courtyard', accent: 0x93c5fd, pieces: [[0.19, 0.30, 0.11, 0.12], [0.37, 0.46, 0.10, 0.11], [0.63, 0.46, 0.10, 0.11], [0.81, 0.30, 0.11, 0.12]] },
  { id: 'serpent-pass', accent: 0x4ade80, pieces: [[0.28, 0.25, 0.14, 0.10], [0.70, 0.41, 0.15, 0.11], [0.29, 0.56, 0.14, 0.11], [0.70, 0.70, 0.14, 0.10]] },
  { id: 'ruined-library', accent: 0xfda4af, pieces: [[0.20, 0.31, 0.10, 0.19], [0.45, 0.29, 0.10, 0.16], [0.72, 0.42, 0.10, 0.20], [0.30, 0.67, 0.10, 0.13]] },
  { id: 'echo-chambers', accent: 0xc4b5fd, pieces: [[0.27, 0.35, 0.12, 0.12], [0.73, 0.35, 0.12, 0.12], [0.27, 0.67, 0.12, 0.12], [0.73, 0.67, 0.12, 0.12], [0.50, 0.50, 0.12, 0.09]] },
  { id: 'fallen-gateway', accent: 0xfcd34d, pieces: [[0.18, 0.22, 0.11, 0.16], [0.82, 0.22, 0.11, 0.16], [0.30, 0.54, 0.13, 0.09], [0.70, 0.54, 0.13, 0.09]] },
  { id: 'sunken-temple', accent: 0x2dd4bf, pieces: [[0.26, 0.29, 0.10, 0.12], [0.74, 0.29, 0.10, 0.12], [0.50, 0.50, 0.16, 0.12], [0.26, 0.72, 0.10, 0.11], [0.74, 0.72, 0.10, 0.11]] },
  { id: 'scattered-monoliths', accent: 0xa3e635, pieces: [[0.16, 0.32, 0.10, 0.09], [0.41, 0.41, 0.10, 0.14], [0.77, 0.32, 0.10, 0.11], [0.24, 0.68, 0.11, 0.11], [0.70, 0.67, 0.10, 0.13]] },
  { id: 'forge-works', accent: 0xfb923c, pieces: [[0.28, 0.30, 0.16, 0.11], [0.73, 0.33, 0.11, 0.17], [0.52, 0.57, 0.11, 0.11], [0.23, 0.72, 0.12, 0.11]] },
  { id: 'whispering-crypt', accent: 0xd8b4fe, pieces: [[0.22, 0.40, 0.10, 0.17], [0.50, 0.27, 0.10, 0.09], [0.78, 0.40, 0.10, 0.17], [0.40, 0.68, 0.11, 0.10]] },
  { id: 'thorn-labyrinth', accent: 0x86efac, pieces: [[0.23, 0.28, 0.13, 0.10], [0.68, 0.27, 0.12, 0.11], [0.48, 0.44, 0.13, 0.09], [0.23, 0.67, 0.13, 0.10], [0.74, 0.68, 0.12, 0.10]] },
  { id: 'storm-hall', accent: 0x7dd3fc, pieces: [[0.38, 0.26, 0.13, 0.10], [0.72, 0.46, 0.11, 0.16], [0.29, 0.55, 0.12, 0.12], [0.56, 0.73, 0.15, 0.10]] },
  { id: 'obsidian-crossroads', accent: 0xf9a8d4, pieces: [[0.17, 0.34, 0.09, 0.11], [0.83, 0.34, 0.09, 0.11], [0.50, 0.49, 0.13, 0.12], [0.21, 0.70, 0.11, 0.09], [0.79, 0.70, 0.11, 0.09]] },
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
      if (isSpawnSafe(point, layout, getMinimumSpawnDistance(room)) && candidates.every(previous =>
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
    Math.floor((room - 1) / ROOM_DIFFICULTY.roomsPerExtraEnemy) +
    Math.floor((room - 1) / 10));
};

export const getRoomDefinition = (roomNumber: number, worldId: WorldId = 1): RoomDefinition => {
  const room = Math.min(CHAPTER_ROOM_COUNT, Math.max(1, Math.floor(roomNumber)));
  const isBossRoom = room % BOSS_ROOM_INTERVAL === 0;
  // Count only normal rooms to cycle through *every* layout, not skip a
  // pattern whenever its previous index happens to land on a boss chamber.
  const regularIndex = (room - 1) - Math.floor((room - 1) / BOSS_ROOM_INTERVAL);
  // Each world visits the same 21 hand-designed patterns in a different order.
  const index = (regularIndex + (worldId - 1) * 4) % TEMPLATES.length;
  const layout = makeLayout(room, index);
  const enemyCount = isBossRoom ? (room === 15 ? 2 : 1) : getEnemyCountForRoom(room);
  // Bosses receive an open arena: mobility and projectile patterns remain fair.
  const bossLayout = isBossRoom ? makeLayout(room, 0) : layout;
  const bossSpawns = Array.from({ length: enemyCount }, (_, index) => ({
    x: bossLayout.bounds.x + bossLayout.bounds.width * (enemyCount === 1 ? 0.5 : index === 0 ? 0.32 : 0.68),
    y: bossLayout.bounds.y + Math.min(190, bossLayout.bounds.height * 0.21),
  }));
  return {
    number: room, isBossRoom, enemyCount,
    layout: bossLayout,
    enemySpawns: isBossRoom ? bossSpawns : layout.enemySpawns.slice(0, enemyCount),
  };
};

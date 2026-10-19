import { ARENA_BOUNDS } from '../config/gameplay';
import type { SpawnPoint } from '../enemies/EnemySpawner';

export const CHAPTER_ROOM_COUNT = 50;
export const BOSS_ROOM_INTERVAL = 5;
export const SAFE_SPAWN_DISTANCE = 120;

export interface ObstacleDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomLayout {
  id: string;
  playerSpawn: SpawnPoint;
  enemySpawns: readonly SpawnPoint[];
  obstacles: readonly ObstacleDefinition[];
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
  maxEnemyCount: 8,
  bossRoomBonusEnemies: 2,
});

const playerSpawn = {
  x: ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2,
  y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - 48,
};

const openSpawns = [
  { x: 70, y: 150 },
  { x: 320, y: 150 },
  { x: 72, y: 260 },
  { x: 318, y: 260 },
  { x: 76, y: 380 },
  { x: 314, y: 380 },
  { x: 78, y: 490 },
  { x: 312, y: 490 },
] as const;

export const ROOM_LAYOUTS: readonly RoomLayout[] = [
  {
    id: 'open-court',
    playerSpawn,
    enemySpawns: openSpawns,
    obstacles: [],
  },
  {
    id: 'twin-pillars',
    playerSpawn,
    enemySpawns: [
      { x: 72, y: 150 },
      { x: 318, y: 150 },
      { x: 195, y: 205 },
      { x: 68, y: 315 },
      { x: 322, y: 315 },
      { x: 195, y: 440 },
      { x: 72, y: 495 },
      { x: 318, y: 495 },
    ],
    obstacles: [
      { x: 128, y: 335, width: 44, height: 150 },
      { x: 262, y: 335, width: 44, height: 150 },
    ],
  },
  {
    id: 'central-vault',
    playerSpawn,
    enemySpawns: openSpawns,
    obstacles: [{ x: 195, y: 330, width: 88, height: 88 }],
  },
  {
    id: 'split-lanes',
    playerSpawn,
    enemySpawns: [
      { x: 70, y: 145 },
      { x: 320, y: 145 },
      { x: 195, y: 190 },
      { x: 75, y: 285 },
      { x: 315, y: 285 },
      { x: 195, y: 405 },
      { x: 75, y: 495 },
      { x: 315, y: 495 },
    ],
    obstacles: [
      { x: 132, y: 335, width: 36, height: 210 },
      { x: 258, y: 335, width: 36, height: 210 },
    ],
  },
] as const;

export const getEnemyCountForRoom = (roomNumber: number): number => {
  const normalizedRoom = Math.max(1, Math.floor(roomNumber));
  const regularCount =
    ROOM_DIFFICULTY.baseEnemyCount +
    Math.floor((normalizedRoom - 1) / ROOM_DIFFICULTY.roomsPerExtraEnemy);
  const bossBonus = normalizedRoom % BOSS_ROOM_INTERVAL === 0
    ? ROOM_DIFFICULTY.bossRoomBonusEnemies
    : 0;

  return Math.min(ROOM_DIFFICULTY.maxEnemyCount, regularCount + bossBonus);
};

export const getRoomDefinition = (roomNumber: number): RoomDefinition => {
  const normalizedRoom = Math.min(
    CHAPTER_ROOM_COUNT,
    Math.max(1, Math.floor(roomNumber)),
  );
  const isBossRoom = normalizedRoom % BOSS_ROOM_INTERVAL === 0;
  const layoutIndex = isBossRoom
    ? 0
    : (normalizedRoom - 1) % ROOM_LAYOUTS.length;
  const layout = ROOM_LAYOUTS[layoutIndex];

  if (!layout) {
    throw new Error('Room layout configuration is empty.');
  }

  // A boss room has one real boss; normal rooms retain phase-4 scaling.
  const enemyCount = isBossRoom ? 1 : getEnemyCountForRoom(normalizedRoom);
  return {
    number: normalizedRoom,
    isBossRoom,
    enemyCount,
    layout,
    enemySpawns: isBossRoom
      ? [{ x: ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2, y: ARENA_BOUNDS.y + 165 }]
      : layout.enemySpawns.slice(0, enemyCount),
  };
};

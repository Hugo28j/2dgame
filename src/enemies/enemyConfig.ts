import { ARENA_BOUNDS } from '../config/gameplay';

export interface EnemyConfig {
  id: string;
  name: string;
  maxHp: number;
  damage: number;
  defense: number;
  movementSpeed: number;
  attackRange: number;
  attackIntervalMs: number;
}

export const SLIME_CONFIG: Readonly<EnemyConfig> = Object.freeze({
  id: 'slime',
  name: 'Moss Slime',
  maxHp: 72,
  damage: 14,
  defense: 6,
  movementSpeed: 62,
  attackRange: 26,
  attackIntervalMs: 700,
});

export const SLIME_SPAWN_POINTS = [
  { x: ARENA_BOUNDS.x + 68, y: ARENA_BOUNDS.y + 82 },
  { x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - 68, y: ARENA_BOUNDS.y + 82 },
  { x: ARENA_BOUNDS.x + 68, y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - 72 },
  { x: ARENA_BOUNDS.x + ARENA_BOUNDS.width - 68, y: ARENA_BOUNDS.y + ARENA_BOUNDS.height - 72 },
] as const;

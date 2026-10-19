import { GAME_WIDTH } from './constants';

export const ARENA_BOUNDS = {
  x: 18,
  y: 82,
  width: GAME_WIDTH - 36,
  height: 558,
} as const;

export const PLAYER_SPEED = 210;
export const PLAYER_BASE_CRITICAL_CHANCE = 0.1;

export const JOYSTICK_CONFIG = {
  radius: 52,
  interactionSize: 148,
  deadZone: 0.16,
  y: 754,
  movementX: 92,
  aimX: GAME_WIDTH - 92,
} as const;

export const TRAINING_TARGETS = [
  { id: 'target-north-west', x: 92, y: 174 },
  { id: 'target-north-east', x: 298, y: 174 },
  { id: 'target-south', x: 195, y: 542 },
] as const;

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { ArenaRectangle } from './roomConfig';

/** Pan the room behind a HUD fixed to the active mobile or desktop viewport. */
export interface CameraScroll { x: number; y: number }
export function targetArenaScroll(
  playerX: number, playerY: number, bounds: Readonly<ArenaRectangle>,
  screenWidth = GAME_WIDTH, screenHeight = GAME_HEIGHT,
): CameraScroll {
  const maxX = Math.max(0, bounds.x + bounds.width + 18 - screenWidth);
  const maxY = Math.max(0, bounds.y + bounds.height + 204 - screenHeight);
  return {
    x: Math.max(0, Math.min(maxX, playerX - screenWidth / 2)),
    y: Math.max(0, Math.min(maxY, playerY - (screenHeight - 124) / 2)),
  };
}

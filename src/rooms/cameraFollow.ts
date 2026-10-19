import type { ArenaRectangle } from './roomConfig';

/** Preserve the familiar 390x844 presentation. The camera pans behind fixed HUD
 * rather than zooming the game or moving the mobile joystick controls. */
export interface CameraScroll { x: number; y: number }
export function targetArenaScroll(
  playerX: number, playerY: number, bounds: Readonly<ArenaRectangle>,
  screenWidth = 390, screenHeight = 844,
): CameraScroll {
  const maxX = Math.max(0, bounds.x + bounds.width + 18 - screenWidth);
  const maxY = Math.max(0, bounds.y + bounds.height + 204 - screenHeight);
  return {
    x: Math.max(0, Math.min(maxX, playerX - screenWidth / 2)),
    y: Math.max(0, Math.min(maxY, playerY - (screenHeight - 124) / 2)),
  };
}

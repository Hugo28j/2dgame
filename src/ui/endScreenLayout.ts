import { GAME_SCENE_KEY, MENU_SCENE_KEY } from '../config/constants';

export type EndScreenAction = 'replay' | 'menu';

/** Keep both input paths tied to the requested scene destinations. */
export function sceneKeyForEndScreenAction(action: EndScreenAction): string {
  return action === 'replay' ? GAME_SCENE_KEY : MENU_SCENE_KEY;
}

export interface EndScreenButtonBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface EndScreenLayout {
  readonly centerX: number;
  readonly panelLeft: number;
  readonly panelRight: number;
  readonly replay: EndScreenButtonBounds;
  readonly menu: EndScreenButtonBounds;
}

export interface ClientButtonBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Layout shared by rendering and the scene-level input fallback. */
export function endScreenLayout(viewportWidth: number): EndScreenLayout {
  const centerX = viewportWidth / 2;
  const button = (y: number): EndScreenButtonBounds => ({
    x: centerX,
    y,
    width: 300,
    height: 60,
  });
  return {
    centerX,
    panelLeft: centerX - 152,
    panelRight: centerX + 154,
    replay: button(686),
    menu: button(755),
  };
}

export function containsScreenPoint(
  bounds: Readonly<EndScreenButtonBounds>,
  x: number,
  y: number,
): boolean {
  return Math.abs(x - bounds.x) <= bounds.width / 2 &&
    Math.abs(y - bounds.y) <= bounds.height / 2;
}

/** Position a native HTML button exactly over its Phaser counterpart. */
export function clientBoundsForGameButton(
  bounds: Readonly<EndScreenButtonBounds>,
  canvasBounds: Readonly<{ left: number; top: number; width: number; height: number }>,
  gameWidth: number,
  gameHeight: number,
): ClientButtonBounds | undefined {
  if (canvasBounds.width <= 0 || canvasBounds.height <= 0 || gameWidth <= 0 || gameHeight <= 0) {
    return undefined;
  }
  const scaleX = canvasBounds.width / gameWidth;
  const scaleY = canvasBounds.height / gameHeight;
  return {
    left: canvasBounds.left + (bounds.x - bounds.width / 2) * scaleX,
    top: canvasBounds.top + (bounds.y - bounds.height / 2) * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  };
}

/** Translate a browser pointer to Phaser's fixed logical canvas coordinates. */
export function clientPointInGame(
  clientX: number,
  clientY: number,
  canvasBounds: Readonly<{ left: number; top: number; width: number; height: number }>,
  gameWidth: number,
  gameHeight: number,
): { x: number; y: number } | undefined {
  if (canvasBounds.width <= 0 || canvasBounds.height <= 0) return undefined;
  if (clientX < canvasBounds.left || clientY < canvasBounds.top ||
      clientX > canvasBounds.left + canvasBounds.width ||
      clientY > canvasBounds.top + canvasBounds.height) return undefined;
  return {
    x: (clientX - canvasBounds.left) * gameWidth / canvasBounds.width,
    y: (clientY - canvasBounds.top) * gameHeight / canvasBounds.height,
  };
}

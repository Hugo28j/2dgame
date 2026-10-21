/** Logical HOME button area for the new end screen (both win and death). */
export interface HomeButtonBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ClientHomeButtonBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function homeButtonLayout(gameWidth: number): HomeButtonBounds {
  return { x: gameWidth / 2, y: 725, width: Math.min(310, gameWidth - 60), height: 64 };
}

/**
 * Maps logical game coordinates into real viewport pixels for Phaser.Scale.FIT.
 * This keeps the REAL HTML HOME button exactly where it appears on the canvas.
 */
export function homeButtonClientBounds(
  bounds: Readonly<HomeButtonBounds>,
  canvas: Readonly<{ left: number; top: number; width: number; height: number }>,
  gameWidth: number,
  gameHeight: number,
): ClientHomeButtonBounds | undefined {
  if (gameWidth <= 0 || gameHeight <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return undefined;
  }
  const sx = canvas.width / gameWidth;
  const sy = canvas.height / gameHeight;
  return {
    left: canvas.left + (bounds.x - bounds.width / 2) * sx,
    top: canvas.top + (bounds.y - bounds.height / 2) * sy,
    width: bounds.width * sx,
    height: bounds.height * sy,
  };
}

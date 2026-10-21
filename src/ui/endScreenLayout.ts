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

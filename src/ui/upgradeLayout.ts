/** One geometry source for animated power-up plates and stable click targets. */
export function upgradeCardBounds(viewportWidth: number, index: number): {
  x: number; y: number; width: number; height: number;
} {
  return { x: viewportWidth / 2, y: 302 + index * 112, width: 330, height: 99 };
}

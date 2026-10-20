export type BulletPattern =
  | 'single' | 'double' | 'fan' | 'radial'
  | 'machinegun' | 'spiral' | 'reverse-spiral' | 'cross'
  | 'ring' | 'offset-ring' | 'wide' | 'needle' | 'shotgun-six';

/** Pure, deterministic per-volley attack patterns, suitable for regression tests. */
export function shotAngles(pattern: BulletPattern, targetAngle: number, volley = 0): number[] {
  const circle = (count: number, offset = 0) =>
    Array.from({ length: count }, (_, index) => (index * 2 * Math.PI) / count + offset);
  switch (pattern) {
    case 'shotgun-six': return [-0.35, -0.21, -0.07, 0.07, 0.21, 0.35].map(delta => targetAngle + delta);
    case 'radial': return circle(8);
    case 'ring': return circle(12);
    case 'offset-ring': return circle(12, (volley % 2) * Math.PI / 12);
    case 'cross': return circle(4, Math.PI / 4 + (volley % 2) * Math.PI / 8);
    case 'spiral': return [volley * Math.PI / 6];
    case 'reverse-spiral': return [-volley * Math.PI / 6];
    case 'machinegun': return [targetAngle];
    case 'needle': return [targetAngle - 0.07, targetAngle, targetAngle + 0.07];
    case 'wide': return [-0.54, -0.27, 0, 0.27, 0.54].map(delta => targetAngle + delta);
    case 'fan': return [-0.28, 0, 0.28].map(delta => targetAngle + delta);
    case 'double': return [-0.14, 0.14].map(delta => targetAngle + delta);
    case 'single': return [targetAngle];
  }
}

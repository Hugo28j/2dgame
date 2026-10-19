import type { BulletPattern } from './AdvancedEnemy';

/** Phase-two radial bursts cover all directions, unlike ordinary aimed fans. */
export function shotAngles(pattern: BulletPattern, targetAngle: number): number[] {
  if (pattern === 'radial') {
    return Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);
  }
  const offsets = pattern === 'single' ? [0] :
    pattern === 'double' ? [-0.14, 0.14] : [-0.28, 0, 0.28];
  return offsets.map(offset => targetAngle + offset);
}

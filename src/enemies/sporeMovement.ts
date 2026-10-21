import type { PoisonBounds } from './poisonPlacement';
export interface SporeVector {x: number; y: number}
/** Patrols changing elliptical waypoints across the arena, instead of camping. */
export function sporePatrolVelocity(
  boss: SporeVector, hero: SporeVector, arena: PoisonBounds, timeMs: number,
  speed: number, sign: number,
): SporeVector {
  const orbit = (Math.max(0, timeMs) / 1850) * (sign >= 0 ? 1 : -1);
  const midX = arena.x + arena.width / 2;
  const midY = arena.y + arena.height / 2;
  const rx = Math.max(45, arena.width * 0.34);
  const ry = Math.max(45, arena.height * 0.31);
  // Target moves along an oval in the arena, with slight focus on the hero.
  const x = Math.max(arena.x + 44, Math.min(arena.x + arena.width - 44,
    midX + Math.cos(orbit + 0.6) * rx + (hero.x - midX) * 0.13));
  const y = Math.max(arena.y + 44, Math.min(arena.y + arena.height - 44,
    midY + Math.sin(orbit + 0.6) * ry + (hero.y - midY) * 0.13));
  const dx = x - boss.x, dy = y - boss.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length * speed, y: dy / length * speed };
}

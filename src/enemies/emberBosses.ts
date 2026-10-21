export type EmberBossAttack =
  | 'spinning-lasers'
  | 'ground-fireball'
  | 'edge-cannons'
  | 'pentaflare'
  | 'lava-summon'
  | 'lava-geysers'
  | 'furnace-wave';

export const EMBER_BOSS_ATTACKS = Object.freeze({
  laserWarningMs: 650,
  laserDurationMs: 4800,
  laserAngularSpeed: 0.00105,
  laserWidth: 14,
  groundFireballFlightMs: 760,
  groundBurstCount: 10,
  groundBurstSpeed: 235,
  cannonWarningMs: 700,
  pentaflareIntervalMs: 460,
  lavaSummonIntervalMs: 7200,
  lavaSummonCap: 3,
  geyserWarningMs: 900,
  geyserRadius: 46,
  furnaceWaveCount: 14,
});

export function getEmberBossAttack(roomNumber: number, bossSlot = 0): EmberBossAttack {
  const room = Math.max(5, Math.min(30, Math.floor(roomNumber / 5) * 5));
  if (room === 5) return 'spinning-lasers';
  if (room === 10) return 'ground-fireball';
  if (room === 15) return bossSlot === 0 ? 'edge-cannons' : 'pentaflare';
  if (room === 20) return 'lava-summon';
  if (room === 25) return 'lava-geysers';
  return 'furnace-wave';
}

export function laserDirection(cycle: number): -1 | 1 {
  return Math.abs(Math.floor(cycle)) % 2 === 0 ? 1 : -1;
}

/** Distance from a point to a finite laser segment. */
export function pointToLaserDistance(px: number, py: number,
  ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

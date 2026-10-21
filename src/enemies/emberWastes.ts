import type { EnemyConfig, EnemyKind } from './enemyConfig';

export type EmberMinionKind = Exclude<EnemyKind, 'boss'>;

/** World 3 has a fully independent minion roster. The existing EnemyKind values
 * remain internal AI slots so rewards, saves and the other four worlds stay compatible. */
export const EMBER_ROSTER: Readonly<Record<EmberMinionKind, Readonly<EnemyConfig>>> = Object.freeze({
  slime: {
    id: 'slime', name: 'Ash Crawler', maxHp: 78, damage: 15, defense: 6,
    movementSpeed: 112, attackRange: 28, attackIntervalMs: 650,
  },
  archer: {
    id: 'archer', name: 'Furnace Breather', maxHp: 92, damage: 13, defense: 2,
    movementSpeed: 103, attackRange: 170, attackIntervalMs: 420,
  },
  charger: {
    id: 'charger', name: 'Blazehound', maxHp: 140, damage: 18, defense: 8,
    movementSpeed: 188, attackRange: 30, attackIntervalMs: 720,
  },
  mage: {
    id: 'mage', name: 'Cinder Warlock', maxHp: 165, damage: 24, defense: 4,
    movementSpeed: 101, attackRange: 250, attackIntervalMs: 1650,
  },
  tank: {
    id: 'tank', name: 'Magma Bulwark', maxHp: 260, damage: 28, defense: 18,
    movementSpeed: 61, attackRange: 78, attackIntervalMs: 1050,
  },
  bomber: {
    id: 'bomber', name: 'Bombardier Imp', maxHp: 128, damage: 26, defense: 3,
    movementSpeed: 100, attackRange: 285, attackIntervalMs: 1100,
  },
});

export const EMBER_UNLOCK_ROOMS: Readonly<Record<EmberMinionKind, number>> = Object.freeze({
  slime: 1,
  archer: 3,
  charger: 7,
  mage: 11,
  tank: 16,
  bomber: 21,
});

export const EMBER_ATTACKS = Object.freeze({
  flameDamageFactor: 0.28,
  flameProjectileSpeed: 255,
  fireballProjectileSpeed: 205,
  houndTrailSpacingMs: 170,
  houndTrailRadius: 31,
  houndTrailDurationMs: 1450,
  houndTrailDamageFactor: 0.32,
  bulwarkSlamRadius: 82,
  bomberRadius: 58,
  bomberWindupMs: 900,
});

export function emberKindForRoom(roomNumber: number, spawnIndex: number): EmberMinionKind {
  const room = Math.max(1, Math.floor(roomNumber));
  const index = Math.max(0, Math.floor(spawnIndex));
  const entries = Object.entries(EMBER_UNLOCK_ROOMS) as Array<[EmberMinionKind, number]>;
  const introduced = entries.find(([, unlock]) => unlock === room);
  if (introduced && index === 0) return introduced[0];

  const weighted: EmberMinionKind[] = [];
  for (const [kind, unlock] of entries) {
    if (room < unlock) continue;
    const age = room - unlock;
    const weight = kind === 'slime' ? Math.max(2, 6 - Math.floor(room / 7)) :
      Math.min(7, 2 + Math.floor(age / 4));
    for (let i = 0; i < weight; i++) weighted.push(kind);
  }
  const position = ((Math.imul(index + 17, 43) ^ Math.imul(room + 5, 37)) >>> 0) % weighted.length;
  return weighted[position] ?? 'slime';
}

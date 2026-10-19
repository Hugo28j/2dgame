export type EnemyKind = 'slime' | 'archer' | 'charger' | 'mage' | 'tank' | 'bomber' | 'boss';

export interface EnemyConfig {
  id: EnemyKind;
  name: string;
  maxHp: number;
  damage: number;
  defense: number;
  movementSpeed: number;
  attackRange: number;
  attackIntervalMs: number;
}
export interface SlimeRuntimeStats extends EnemyConfig { roomNumber: number; }

export const SLIME_CONFIG: Readonly<EnemyConfig> = Object.freeze({
  id: 'slime', name: 'Moss Slime', maxHp: 72, damage: 14, defense: 6,
  movementSpeed: 62, attackRange: 26, attackIntervalMs: 700,
});

export const ENEMY_CONFIGS: Readonly<Record<EnemyKind, EnemyConfig>> = {
  slime: SLIME_CONFIG,
  archer: { id: 'archer', name: 'Thorn Archer', maxHp: 54, damage: 12, defense: 2, movementSpeed: 88, attackRange: 225, attackIntervalMs: 1500 },
  charger: { id: 'charger', name: 'Rush Beetle', maxHp: 110, damage: 20, defense: 8, movementSpeed: 72, attackRange: 210, attackIntervalMs: 1100 },
  mage: { id: 'mage', name: 'Rune Wisp', maxHp: 68, damage: 14, defense: 4, movementSpeed: 85, attackRange: 210, attackIntervalMs: 1950 },
  tank: { id: 'tank', name: 'Stone Brute', maxHp: 235, damage: 23, defense: 18, movementSpeed: 40, attackRange: 30, attackIntervalMs: 1050 },
  bomber: { id: 'bomber', name: 'Blast Shroom', maxHp: 75, damage: 27, defense: 3, movementSpeed: 82, attackRange: 105, attackIntervalMs: 1200 },
  boss: { id: 'boss', name: 'Dungeon Guardian', maxHp: 880, damage: 23, defense: 12, movementSpeed: 66, attackRange: 280, attackIntervalMs: 1550 },
};
export const BOSS_NAMES = ['Stone Warden', 'Ember Colossus', 'Frost Tyrant', 'Void Sentinel'] as const;

export const SLIME_DIFFICULTY = Object.freeze({ hpPerRoom: 0.08, damagePerRoom: 0.05 });

export const getEnemyStatsForRoom = (kind: EnemyKind, roomNumber: number): SlimeRuntimeStats => {
  const base = ENEMY_CONFIGS[kind];
  const number = Math.max(1, Math.floor(roomNumber));
  const completed = number - 1;
  return {
    ...base, roomNumber: number,
    maxHp: Math.round(base.maxHp * (1 + completed * SLIME_DIFFICULTY.hpPerRoom)),
    damage: Math.round(base.damage * (1 + completed * SLIME_DIFFICULTY.damagePerRoom)),
  };
};
export const getSlimeStatsForRoom = (roomNumber: number): SlimeRuntimeStats =>
  getEnemyStatsForRoom('slime', roomNumber);

/** Deterministic enemy roster; later rooms add types while preserving some basic Slimes. */
export const getEnemyKindForRoom = (roomNumber: number, spawnIndex: number): EnemyKind => {
  if (roomNumber % 5 === 0) return 'boss';
  const pool: EnemyKind[] = ['slime'];
  if (roomNumber >= 2) pool.push('archer');
  if (roomNumber >= 3) pool.push('charger');
  if (roomNumber >= 4) pool.push('tank');
  if (roomNumber >= 6) pool.push('mage');
  if (roomNumber >= 7) pool.push('bomber');
  const index = Math.max(0, Math.floor(spawnIndex));
  // Always showcase a newly introduced enemy in its first available room.
  const debut: Partial<Record<number, EnemyKind>> = {
    2: 'archer', 3: 'charger', 4: 'tank', 6: 'mage', 7: 'bomber',
  };
  if (index === 0 && debut[roomNumber]) return debut[roomNumber];
  return pool[(index + roomNumber - 1) % pool.length] ?? 'slime';
};
export const getBossName = (roomNumber: number): string =>
  BOSS_NAMES[Math.max(0, Math.min(3, Math.floor(roomNumber / 5) - 1))] ?? BOSS_NAMES[0];

import { BOSSES, getBossProfile, getBossTier } from './bossProfiles';

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
export const BOSS_NAMES = BOSSES.map(boss => boss.name);

export const SLIME_DIFFICULTY = Object.freeze({ hpPerRoom: 0.08, damagePerRoom: 0.05 });

export const getEnemyStatsForRoom = (kind: EnemyKind, roomNumber: number): SlimeRuntimeStats => {
  const base = ENEMY_CONFIGS[kind];
  const number = Math.max(1, Math.floor(roomNumber));
  const completed = number - 1;
  return {
    ...base, roomNumber: number,
    maxHp: Math.round(base.maxHp * (1 + completed * SLIME_DIFFICULTY.hpPerRoom) *
      (kind === 'boss' ? 1 + (getBossTier(number) - 1) * 0.09 : 1)),
    damage: Math.round(base.damage * (1 + completed * SLIME_DIFFICULTY.damagePerRoom) *
      (kind === 'boss' ? 1 + (getBossTier(number) - 1) * 0.05 : 1)),
  };
};
export const getSlimeStatsForRoom = (roomNumber: number): SlimeRuntimeStats =>
  getEnemyStatsForRoom('slime', roomNumber);

/** First rooms contain only slimes. New enemies unlock gradually, then become
 * more frequent as the dungeon gets deeper. Deterministic for reproducible runs. */
export const ENEMY_UNLOCK_ROOMS = {
  slime: 1, archer: 7, charger: 12, tank: 17, mage: 23, bomber: 29,
} as const;

export const getEnemyKindForRoom = (roomNumber: number, spawnIndex: number): EnemyKind => {
  const room = Math.max(1, Math.floor(roomNumber));
  if (room % 5 === 0) return 'boss';
  const index = Math.max(0, Math.floor(spawnIndex));
  const entries = Object.entries(ENEMY_UNLOCK_ROOMS) as Array<
    [Exclude<EnemyKind, 'boss'>, number]>;
  // A new enemy always appears when its type is first introduced.
  const newKind = entries.find(([, unlock]) => unlock === room);
  if (newKind && index === 0) return newKind[0];

  const weighted: EnemyKind[] = [];
  for (const [kind, unlock] of entries) {
    if (room < unlock) continue;
    const weight = kind === 'slime'
      ? Math.max(2, 7 - Math.floor(room / 9))
      : Math.min(6, 2 + Math.floor((room - unlock) / 5));
    for (let i = 0; i < weight; i++) weighted.push(kind);
  }
  // Alternate deterministic pseudo-random slots so consecutive rooms do not
  // have identical mixes while types never spawn before their unlock room.
  const position = ((Math.imul(index + 13, 41) ^ Math.imul(room + 11, 31)) >>> 0) % weighted.length;
  return weighted[position] ?? 'slime';
};
export const getBossName = (roomNumber: number): string => getBossProfile(roomNumber).name;

import { getWorld, type WorldId } from '../worlds/worldConfig';
import { BOSSES, getBossProfile, getBossTier } from './bossProfiles';
import { BRAMBLE_GUNNER_HP_MULTIPLIER, WORLD1_MOSSLING_SPEED_MULTIPLIER,
  WORLD1_BRIAR_DAMAGE_MULTIPLIER, WORLD1_WISP_HP_MULTIPLIER,
  WORLD1_WISP_FIRE_RATE_MULTIPLIER, WORLD1_SPORECAP_HP_MULTIPLIER,
  WORLD1_SPORECAP_SPEED_MULTIPLIER } from './enemyBalance';
import { FROZEN_EARLY, earlyFrozenEnemy } from './frozenEarlyGame';
import { FROZEN_BALANCE, WORLD2_UNLOCK_ROOMS } from './frozenBalance';

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
  movementSpeed: 112, attackRange: 26, attackIntervalMs: 700,
});

export const ENEMY_CONFIGS: Readonly<Record<EnemyKind, EnemyConfig>> = {
  slime: SLIME_CONFIG,
  archer: { id: 'archer', name: 'Thorn Archer', maxHp: 54, damage: 12, defense: 2, movementSpeed: 103, attackRange: 225, attackIntervalMs: 1500 },
  charger: { id: 'charger', name: 'Rush Beetle', maxHp: 110, damage: 20, defense: 8, movementSpeed: 94, attackRange: 210, attackIntervalMs: 1100 },
  mage: { id: 'mage', name: 'Rune Wisp', maxHp: 68, damage: 14, defense: 4, movementSpeed: 101, attackRange: 210, attackIntervalMs: 1950 },
  tank: { id: 'tank', name: 'Stone Brute', maxHp: 235, damage: 23, defense: 18, movementSpeed: 56, attackRange: 30, attackIntervalMs: 1050 },
  bomber: { id: 'bomber', name: 'Blast Shroom', maxHp: 75, damage: 27, defense: 3, movementSpeed: 100, attackRange: 105, attackIntervalMs: 1200 },
  boss: { id: 'boss', name: 'Dungeon Guardian', maxHp: 880, damage: 23, defense: 12, movementSpeed: 75, attackRange: 280, attackIntervalMs: 1550 },
};
export const BOSS_NAMES = BOSSES.map(boss => boss.name);

export const SLIME_DIFFICULTY = Object.freeze({ hpPerRoom: 0.08, damagePerRoom: 0.05 });

export const getEnemyStatsForRoom = (kind: EnemyKind, roomNumber: number,
  worldId: WorldId = 1, bossSlot = 0): SlimeRuntimeStats => {
  const base = ENEMY_CONFIGS[kind];
  const number = Math.max(1, Math.floor(roomNumber));
  const completed = number - 1;
  const world = getWorld(worldId);
  return {
    ...base, roomNumber: number,
    // Phase 3: current base defense is doubled only in worlds 1 and 2.
    defense: base.defense * (worldId === 1 || worldId === 2 ? 2 : 1),
    maxHp: Math.round(base.maxHp *
      (worldId === 2 && kind === 'mage' ? 3 :
        worldId === 2 && kind === 'archer' ? 1.5 * FROZEN_BALANCE.rangerHpMultiplier :
        worldId === 2 && kind === 'tank' ? FROZEN_BALANCE.golemHpMultiplier :
        worldId === 2 && kind === 'charger' ? FROZEN_BALANCE.shotgunHpMultiplier :
        worldId === 1 && kind === 'mage' ? WORLD1_WISP_HP_MULTIPLIER :
        worldId === 1 && kind === 'bomber' ? WORLD1_SPORECAP_HP_MULTIPLIER : 1) *
      (1 + completed * SLIME_DIFFICULTY.hpPerRoom) *
      (kind === 'boss' ? 1 + (getBossTier(number) - 1) * 0.09 : 1) * world.hpMultiplier *
      // Only Bramble Gunner (first boss, world 1 room 15); Bloom Sentinel
      // in the same room and other world's gunner retain full HP.
      (kind === 'boss' && worldId === 1 && number === 15 && bossSlot === 0
        ? BRAMBLE_GUNNER_HP_MULTIPLIER : 1) *
      (kind === 'boss' && worldId === 2 && number === 5 ? FROZEN_BALANCE.glacierWardenHpMultiplier :
        kind === 'boss' && worldId === 2 && number === 15 ? FROZEN_BALANCE.snowSentinelHpMultiplier : 1) *
      (kind === 'boss' && worldId === 1 && number === 20 ? 1.5 :
        kind === 'boss' && worldId === 1 && number === 30 ? 2 : 1)),
    damage: Math.round(base.damage * (worldId === 2 && kind === 'archer' ? 2 * FROZEN_BALANCE.rangerDamageMultiplier :
      worldId === 1 && kind === 'archer' ? WORLD1_BRIAR_DAMAGE_MULTIPLIER : 1) *
      (1 + completed * SLIME_DIFFICULTY.damagePerRoom) *
      (kind === 'boss' ? 1 + (getBossTier(number) - 1) * 0.05 : 1) * world.damageMultiplier),
    movementSpeed: Math.round(base.movementSpeed * world.speedMultiplier *
      (worldId === 1 && kind === 'slime' ? WORLD1_MOSSLING_SPEED_MULTIPLIER :
        worldId === 1 && kind === 'bomber' ? WORLD1_SPORECAP_SPEED_MULTIPLIER :
        worldId === 2 && kind === 'tank' ? FROZEN_BALANCE.golemSpeedMultiplier : 1)),
    attackIntervalMs: Math.round(base.attackIntervalMs / (world.attackSpeedMultiplier *
      (worldId === 1 && kind === 'mage' ? WORLD1_WISP_FIRE_RATE_MULTIPLIER : 1))),
  };
};
export const getSlimeStatsForRoom = (roomNumber: number, worldId: WorldId = 1): SlimeRuntimeStats =>
  getEnemyStatsForRoom('slime', roomNumber, worldId);

export { WORLD2_UNLOCK_ROOMS } from './frozenBalance';

/** First rooms contain only slimes. New enemies unlock gradually, then become
 * more frequent as the dungeon gets deeper. Deterministic for reproducible runs. */
export const ENEMY_UNLOCK_ROOMS = {
  slime: 1, archer: 4, charger: 11, tank: 16, mage: 21, bomber: 26,
} as const;

export const getEnemyKindForRoom = (roomNumber: number, spawnIndex: number,
  worldId: WorldId = 1): EnemyKind => {
  const room = Math.max(1, Math.floor(roomNumber));
  if (room % 5 === 0) {
    if (worldId === 2 && room === 15) return 'boss';
    if (worldId === 2 && room === 20 && spawnIndex === 1) return 'bomber';
    if (worldId === 2 && room === 30 && spawnIndex === 1) return 'charger';
    return 'boss';
  }
  const index = Math.max(0, Math.floor(spawnIndex));
  if (worldId === FROZEN_EARLY.world && room <= FROZEN_EARLY.lastRoom) {
    return earlyFrozenEnemy(room, index);
  }
  const entries = Object.entries(worldId === 2 ? WORLD2_UNLOCK_ROOMS : ENEMY_UNLOCK_ROOMS) as Array<
    [Exclude<EnemyKind, 'boss'>, number]>;
  // A new enemy always appears when its type is first introduced.
  const newKind = entries.find(([, unlock]) => unlock === room);
  if (newKind && index === 0) return newKind[0];

  const weighted: EnemyKind[] = [];
  for (const [kind, unlock] of entries) {
    if (room < unlock) continue;
    if (worldId === 2 && kind === 'archer' && room >= 21) continue;
    if (worldId === 1 && ((kind === 'archer' && room >= 21) ||
      (kind === 'slime' && room >= 26))) continue;
    const weight = worldId === 1 && kind === 'mage' && room >= 21 ? 7 :
      worldId === 1 && kind === 'bomber' && room >= 26 ? 12 :
      kind === 'slime' ? Math.max(2, 7 - Math.floor(room / 9)) :
      Math.min(6, 2 + Math.floor((room - unlock) / 5));
    for (let i = 0; i < weight; i++) weighted.push(kind);
  }
  // Alternate deterministic pseudo-random slots so consecutive rooms do not
  // have identical mixes while types never spawn before their unlock room.
  const position = ((Math.imul(index + 13, 41) ^ Math.imul(room + 11, 31)) >>> 0) % weighted.length;
  return weighted[position] ?? (worldId === 1 && room >= 26 ? 'bomber' : 'slime');
};
export const getBossName = (roomNumber: number): string => getBossProfile(roomNumber).name;

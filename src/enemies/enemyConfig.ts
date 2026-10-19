export interface EnemyConfig {
  id: string;
  name: string;
  maxHp: number;
  damage: number;
  defense: number;
  movementSpeed: number;
  attackRange: number;
  attackIntervalMs: number;
}

export interface SlimeRuntimeStats extends EnemyConfig {
  roomNumber: number;
}

export const SLIME_CONFIG: Readonly<EnemyConfig> = Object.freeze({
  id: 'slime',
  name: 'Moss Slime',
  maxHp: 72,
  damage: 14,
  defense: 6,
  movementSpeed: 62,
  attackRange: 26,
  attackIntervalMs: 700,
});

export const SLIME_DIFFICULTY = Object.freeze({
  hpPerRoom: 0.08,
  damagePerRoom: 0.05,
});

export const getSlimeStatsForRoom = (roomNumber: number): SlimeRuntimeStats => {
  const normalizedRoom = Math.max(1, Math.floor(roomNumber));
  const completedRooms = normalizedRoom - 1;

  return {
    ...SLIME_CONFIG,
    roomNumber: normalizedRoom,
    maxHp: Math.round(SLIME_CONFIG.maxHp * (1 + completedRooms * SLIME_DIFFICULTY.hpPerRoom)),
    damage: Math.round(
      SLIME_CONFIG.damage * (1 + completedRooms * SLIME_DIFFICULTY.damagePerRoom),
    ),
  };
};

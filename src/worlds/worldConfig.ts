/** Five self-contained, 30-room campaigns. Clearing room 30 unlocks the next. */
export const WORLD_COUNT = 5;
export type WorldId = 1 | 2 | 3 | 4 | 5;

export interface WorldTheme {
  id: WorldId;
  name: string;
  subtitle: string;
  accent: number;
  floor: number;
  grid: number;
  wall: number;
  obstacle: number;
  obstacleBorder: number;
  bossColor: number;
  /** World difficulty compounds with the room difficulty within each chapter. */
  hpMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  attackSpeedMultiplier: number;
  bossNames: readonly string[];
}
export const WORLDS: readonly WorldTheme[] = [
  {
    id: 1, name: 'Verdant Ruins', subtitle: 'Mos, wortels en oude tempels',
    accent: 0x84cc16, floor: 0x10271d, grid: 0x315c37, wall: 0x142c22,
    obstacle: 0x304b36, obstacleBorder: 0x72a967, bossColor: 0x84cc16,
    hpMultiplier: 1, damageMultiplier: 1, speedMultiplier: 1, attackSpeedMultiplier: 1,
    bossNames: ['Moss Warden', 'Thorn Colossus', 'Root Tyrant', 'Bloom Sentinel',
      'Bramble Gunner', 'Wild Stormweaver', 'Spore Alchemist', 'Jade Matriarch',
      'Vine Stalker', 'Heart of the Grove'],
  },
  {
    id: 2, name: 'Frozen Hollow', subtitle: 'IJs, sneeuw en kristalgangen',
    accent: 0x7dd3fc, floor: 0x132a39, grid: 0x346074, wall: 0x183342,
    obstacle: 0x356076, obstacleBorder: 0xa5f3fc, bossColor: 0x38bdf8,
    hpMultiplier: 1.35, damageMultiplier: 1.2, speedMultiplier: 1.04, attackSpeedMultiplier: 1.05,
    bossNames: ['Glacier Warden', 'Rime Colossus', 'Blizzard Tyrant', 'Snow Sentinel',
      'Icebound Gunner', 'Whiteout Weaver', 'Frost Alchemist', 'Crystal Empress',
      'Shiver Stalker', 'Queen of Winter'],
  },
  {
    id: 3, name: 'Ember Wastes', subtitle: 'Lava, as en brandende ruïnes',
    accent: 0xfb923c, floor: 0x331b1c, grid: 0x7a3b2b, wall: 0x3e2222,
    obstacle: 0x67352c, obstacleBorder: 0xfdba74, bossColor: 0xf97316,
    hpMultiplier: 1.75, damageMultiplier: 1.43, speedMultiplier: 1.08, attackSpeedMultiplier: 1.1,
    bossNames: ['Ash Warden', 'Molten Colossus', 'Inferno Tyrant', 'Cinder Sentinel',
      'Coal Gunner', 'Flame Weaver', 'Magma Alchemist', 'Ruby Matriarch',
      'Scorch Stalker', 'Lord of the Furnace'],
  },
  {
    id: 4, name: 'Storm Citadel', subtitle: 'Bliksem, metaal en wolken',
    accent: 0xfde047, floor: 0x20243b, grid: 0x444a72, wall: 0x2c3050,
    obstacle: 0x4b5175, obstacleBorder: 0x93c5fd, bossColor: 0xfacc15,
    hpMultiplier: 2.3, damageMultiplier: 1.72, speedMultiplier: 1.12, attackSpeedMultiplier: 1.15,
    bossNames: ['Thunder Warden', 'Cloud Colossus', 'Tempest Tyrant', 'Bolt Sentinel',
      'Sky Gunner', 'Lightning Weaver', 'Static Alchemist', 'Sapphire Empress',
      'Gale Stalker', 'Storm Emperor'],
  },
  {
    id: 5, name: 'Void Realm', subtitle: 'Schaduwen, runen en kosmische energie',
    accent: 0xc084fc, floor: 0x20152f, grid: 0x45305d, wall: 0x291a38,
    obstacle: 0x49335f, obstacleBorder: 0xe879f9, bossColor: 0xd946ef,
    hpMultiplier: 3, damageMultiplier: 2.05, speedMultiplier: 1.16, attackSpeedMultiplier: 1.2,
    bossNames: ['Abyss Warden', 'Rift Colossus', 'Eclipse Tyrant', 'Shadow Sentinel',
      'Void Gunner', 'Astral Weaver', 'Dark Alchemist', 'Nebula Matriarch',
      'Phantom Stalker', 'Sovereign of Nothing'],
  },
] as const;

export function toWorldId(value: unknown): WorldId {
  return typeof value === 'number' && Number.isSafeInteger(value) &&
    value >= 1 && value <= WORLD_COUNT ? value as WorldId : 1;
}

export function getWorld(id: WorldId): WorldTheme {
  return WORLDS[id - 1]!;
}

export function isWorldUnlocked(id: WorldId, completedWorlds: number): boolean {
  return id <= Math.max(0, Math.min(WORLD_COUNT, completedWorlds)) + 1;
}

export function getWorldBossName(id: WorldId, roomNumber: number, bossSlot = 0): string {
  const tier = Math.max(1, Math.min(6, Math.floor(roomNumber / 5)));
  const rosterIndices = [[0], [2], [4, 3], [6], [7], [9]] as const;
  const index = rosterIndices[tier - 1]?.[bossSlot] ?? rosterIndices[tier - 1]![0];
  return getWorld(id).bossNames[index]!;
}

import { getWorld, getWorldBossName, type WorldId } from '../worlds/worldConfig';
import type { EnemyKind } from './enemyConfig';
import { getBossArchetypeIndex } from './bossProfiles';

export type MinionKind = Exclude<EnemyKind, 'boss'>;
export interface CharacterLook {
  name: string;
  textureKey: string;
  primary: number;
  secondary: number;
  glow: number;
  /** Silhouette design family; shared AI archetypes still behave differently. */
  kind: EnemyKind;
  worldId: WorldId;
}

const names: Readonly<Record<WorldId, Readonly<Record<MinionKind, string>>>> = {
  1: {
    slime: 'Mossling', archer: 'Briar Hunter', charger: 'Horned Beetle',
    mage: 'Willow Wisp', tank: 'Ancient Treant', bomber: 'Sporecap',
  },
  2: {
    slime: 'Snow Puff', archer: 'Frost Ranger', charger: 'Frost Shotgunner',
    mage: 'Aurora Witch', tank: 'Glacier Golem', bomber: 'Ice Bomb Thrower',
  },
  3: {
    slime: 'Cinderling', archer: 'Ash Marksman', charger: 'Magma Hound',
    mage: 'Flame Oracle', tank: 'Obsidian Titan', bomber: 'Volatile Ember',
  },
  4: {
    slime: 'Spark Sprite', archer: 'Sky Sharpshooter', charger: 'Volt Raptor',
    mage: 'Thunder Seer', tank: 'Iron Sentinel', bomber: 'Storm Mine',
  },
  5: {
    slime: 'Void Spawn', archer: 'Abyss Stalker', charger: 'Rift Prowler',
    mage: 'Nebula Witch', tank: 'Dark Colossus', bomber: 'Singularity',
  },
};

const primaryColors: Readonly<Record<WorldId, readonly [number, number, number, number, number, number]>> = {
  1: [0x75c936, 0x4f9d47, 0x9a752d, 0xa9df7b, 0x456d43, 0xc59d54],
  2: [0xb9efff, 0x72cdeb, 0x547cab, 0xb6a7fa, 0x799eb2, 0x9defff],
  3: [0xf98e41, 0xce5638, 0x913f35, 0xf8c05b, 0x62434d, 0xfbb444],
  4: [0xf9e76f, 0x88b7d8, 0x627dbd, 0xecd464, 0x7d8bba, 0xe4e77e],
  5: [0xba8af8, 0x8a5bd1, 0x6d3f9e, 0xe2a6fa, 0x64418b, 0xa876e5],
};

const minionOrder: readonly MinionKind[] = ['slime', 'archer', 'charger', 'mage', 'tank', 'bomber'];

export function getWorldCharacter(worldId: WorldId, kind: EnemyKind, roomNumber = 1, bossSlot = 0): CharacterLook {
  const world = getWorld(worldId);
  if (kind === 'boss') {
    const tier = getBossArchetypeIndex(roomNumber, bossSlot) + 1;
    // Each archetype retains its unique texture when moving to 30-room worlds.
    return {
      name: getWorldBossName(worldId, roomNumber, bossSlot),
      textureKey: `world-${worldId}-boss-${tier}`,
      primary: world.bossColor,
      secondary: primaryColors[worldId][(tier - 1) % 6]!,
      glow: world.accent,
      kind,
      worldId,
    };
  }
  const index = minionOrder.indexOf(kind);
  return {
    name: names[worldId][kind],
    textureKey: `world-${worldId}-${kind}`,
    primary: primaryColors[worldId][index]!,
    secondary: world.obstacleBorder,
    glow: world.accent,
    kind,
    worldId,
  };
}

export function getWorldCharacterRoster(worldId: WorldId): readonly CharacterLook[] {
  return minionOrder.map(kind => getWorldCharacter(worldId, kind));
}

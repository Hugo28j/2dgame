import type { WorldId } from '../worlds/worldConfig';
import Phaser from 'phaser';

import type { SlimeRuntimeStats } from './enemyConfig';
import { Slime } from './Slime';
import { AdvancedEnemy } from './AdvancedEnemy';
import { addBoundedEnemy } from './addBoundedEnemy';
import { getEnemyKindForRoom, getSlimeStatsForRoom } from './enemyConfig';
import { getWorldCharacter } from './worldCharacters';
import type { RoomDefinition } from '../rooms/roomConfig';

export interface SpawnPoint {
  x: number;
  y: number;
}

export class EnemySpawner {
  private nextEnemyNumber = 1;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyGroup: Phaser.Physics.Arcade.Group,
  ) {}

  public spawnRoom(room: Readonly<RoomDefinition>, indices?: readonly number[],
    worldId: WorldId = 1): readonly Slime[] {
    const toSpawn = indices ?? room.enemySpawns.map((_, index) => index);
    return toSpawn.map(index => {
      const point = room.enemySpawns[index];
      if (!point) throw new Error('Missing enemy spawn point for index ' + index);
      const kind = getEnemyKindForRoom(room.number, index, worldId);
      const enemy = kind === 'slime'
        ? new Slime(this.scene, `slime-${this.nextEnemyNumber++}`, point.x, point.y,
            { ...getSlimeStatsForRoom(room.number, worldId) },
            getWorldCharacter(worldId, kind, room.number).textureKey)
        : new AdvancedEnemy(this.scene, `${kind}-${this.nextEnemyNumber++}`,
            point.x, point.y, kind, room.number, worldId,
            kind === 'boss' ? index : 0);
      addBoundedEnemy(enemy, () => this.enemyGroup.add(enemy));
      return enemy;
    });
  }

  public spawnSlimes(
    spawnPoints: readonly SpawnPoint[],
    stats: Readonly<SlimeRuntimeStats>,
  ): readonly Slime[] {
    return spawnPoints.map((point) => {
      const slime = new Slime(
        this.scene,
        `slime-${this.nextEnemyNumber++}`,
        point.x,
        point.y,
        stats,
      );
      addBoundedEnemy(slime, () => this.enemyGroup.add(slime));
      return slime;
    });
  }
}

import Phaser from 'phaser';

import type { SlimeRuntimeStats } from './enemyConfig';
import { Slime } from './Slime';
import { AdvancedEnemy } from './AdvancedEnemy';
import { getEnemyKindForRoom, getSlimeStatsForRoom } from './enemyConfig';
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

  public spawnRoom(room: Readonly<RoomDefinition>): readonly Slime[] {
    return room.enemySpawns.map((point, index) => {
      const kind = getEnemyKindForRoom(room.number, index);
      const enemy = kind === 'slime'
        ? new Slime(this.scene, `slime-${this.nextEnemyNumber++}`, point.x, point.y,
            { ...getSlimeStatsForRoom(room.number) })
        : new AdvancedEnemy(this.scene, `${kind}-${this.nextEnemyNumber++}`,
            point.x, point.y, kind, room.number);
      this.enemyGroup.add(enemy);
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
      this.enemyGroup.add(slime);
      return slime;
    });
  }
}

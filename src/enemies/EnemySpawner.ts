import Phaser from 'phaser';

import type { SlimeRuntimeStats } from './enemyConfig';
import { Slime } from './Slime';

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

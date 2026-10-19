import Phaser from 'phaser';

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

  public spawnSlimes(spawnPoints: readonly SpawnPoint[]): readonly Slime[] {
    return spawnPoints.map((point) => {
      const slime = new Slime(
        this.scene,
        `slime-${this.nextEnemyNumber++}`,
        point.x,
        point.y,
      );
      this.enemyGroup.add(slime);
      return slime;
    });
  }
}

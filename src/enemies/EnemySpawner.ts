import type { WorldId } from '../worlds/worldConfig';
import Phaser from 'phaser';

import type { SlimeRuntimeStats } from './enemyConfig';
import { Slime } from './Slime';
import { AdvancedEnemy } from './AdvancedEnemy';
import { addBoundedEnemy } from './addBoundedEnemy';
import { getEnemyKindForRoom, getSlimeStatsForRoom } from './enemyConfig';
import { getWorldCharacter } from './worldCharacters';
import { glacierBossSlot } from './frozenBalance';

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
            kind === 'boss' ? (worldId === 2 ? glacierBossSlot(room.number) : index) : 0);
      addBoundedEnemy(enemy, () => this.enemyGroup.add(enemy));
      return enemy;
    });
  }

  /** Second phase of World 1 chamber 20: two separate Bloom Sentinels. */
  public spawnSplitBosses(points: readonly SpawnPoint[], room: number): AdvancedEnemy[] {
    return points.map((point, index) => {
      const boss = new AdvancedEnemy(this.scene, `split-boss-${this.nextEnemyNumber++}`,
        point.x, point.y, 'boss', room, 1, 1);
      boss.fasterTwin = true;
      boss.splitTwinIndex = index === 0 ? 0 : 1;
      addBoundedEnemy(boss, () => this.enemyGroup.add(boss));
      return boss;
    });
  }

  /** Summoned Snow Puffs use their own unique IDs, correct world-2 art and
   * are tracked by GameScene so active waves cannot grow without a cap. */
  public summonSnowPuffs(points: readonly SpawnPoint[], room: number): readonly Slime[] {
    return points.map(point => {
      const stats = getSlimeStatsForRoom(room, 2);
      const enemy = new Slime(this.scene, `frost-summon-${this.nextEnemyNumber++}`,
        point.x, point.y, { ...stats, maxHp: Math.round(stats.maxHp * 0.68) },
        'world-2-slime');
      addBoundedEnemy(enemy, () => this.enemyGroup.add(enemy));
      return enemy;
    });
  }

  /** Glacier Golems summoned by Snow Sentinel in World 2 room 15. */
  public summonGlacierGolems(points: readonly SpawnPoint[], room: number): readonly AdvancedEnemy[] {
    return points.map(point => {
      const enemy = new AdvancedEnemy(this.scene, 'sentinel-golem-' + this.nextEnemyNumber++,
        point.x, point.y, 'tank', room, 2);
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

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

  /** Living lava monsters summoned by the World-3 Broodmother. */
  public summonLavaMonsters(points: readonly SpawnPoint[], room: number): readonly AdvancedEnemy[] {
    return points.map(point => {
      const enemy = new AdvancedEnemy(this.scene, 'lava-summon-' + this.nextEnemyNumber++,
        point.x, point.y, 'tank', room, 3);
      enemy.setTint(0xff6b00);
      addBoundedEnemy(enemy, () => this.enemyGroup.add(enemy));
      return enemy;
    });
  }

  /** The final Verdant Ruins encounter calls 10 kamikaze shrooms and two unique gunners. */
  public summonGroveReinforcements(points: readonly SpawnPoint[], room: number): readonly AdvancedEnemy[] {
    const gunKey = 'grove-machine-gunner';
    if (!this.scene.textures.exists(gunKey)) {
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0x2f513c); gfx.fillEllipse(24,28,37,34);
      gfx.fillStyle(0x89a75b); gfx.fillCircle(24,21,12);
      gfx.fillStyle(0x293b31); gfx.fillRect(19,0,10,22);
      gfx.fillStyle(0x9ca3af); gfx.fillRect(21,0,6,21);
      gfx.fillStyle(0xfbbf24); gfx.fillRect(20,0,8,4);
      gfx.lineStyle(3,0x17291e); gfx.strokeEllipse(24,28,37,34);
      gfx.generateTexture(gunKey,48,48); gfx.destroy();
    }
    return points.map((point,index)=>{
      const gunner=index>=10;
      const kind=gunner?'archer':'bomber';
      const enemy=new AdvancedEnemy(this.scene,
        (gunner?'grove-gunner-':'grove-bomber-')+this.nextEnemyNumber++,point.x,point.y,kind,room,1);
      if(gunner){enemy.setTexture(gunKey);enemy.setScale(1.18);}
      addBoundedEnemy(enemy,()=>this.enemyGroup.add(enemy));
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

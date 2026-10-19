import Phaser from 'phaser';

import type { AttackData } from '../combat/damage';
import { addAndLaunch } from '../combat/launchProjectile';
import { PLAYER_BASE_CRITICAL_CHANCE } from '../config/gameplay';
import { Projectile } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import type { Vector2Value } from '../input/vectorMath';
import { BOW_CONFIG, fireIntervalMs } from './weaponConfig';

export class BowWeapon {
  private nextShotAt = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Player,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
  ) {}

  public update(time: number, firing: boolean, direction: Readonly<Vector2Value>): void {
    if (!firing || time < this.nextShotAt) {
      return;
    }

    this.fire(direction);
    this.nextShotAt = time + fireIntervalMs(BOW_CONFIG.fireRate);
  }

  private fire(direction: Readonly<Vector2Value>): void {
    const spawnDistance = 29;
    const attack: AttackData = {
      damage: BOW_CONFIG.damage,
      criticalChance: PLAYER_BASE_CRITICAL_CHANCE + BOW_CONFIG.criticalChanceModifier,
      criticalMultiplier: BOW_CONFIG.criticalMultiplier,
    };
    const projectile = new Projectile(
      this.scene,
      this.owner.x + direction.x * spawnDistance,
      this.owner.y + direction.y * spawnDistance,
      direction,
      BOW_CONFIG.projectileSpeed,
      attack,
      BOW_CONFIG.piercing,
    );

    addAndLaunch(this.projectiles, projectile, direction, BOW_CONFIG.projectileSpeed);
  }
}

import Phaser from 'phaser';

import type { Damageable } from '../combat/damage';
import { InvulnerabilityWindow } from '../combat/InvulnerabilityWindow';
import { PLAYER_SPEED } from '../config/gameplay';
import { PLAYER_TEXTURE_KEY } from '../config/constants';
import type { Vector2Value } from '../input/vectorMath';

export class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public readonly maxHp = 100;
  public readonly defense = 8;
  public currentHp = this.maxHp;
  private readonly invulnerability = new InvulnerabilityWindow();

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURE_KEY);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(20);

    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(16, 8, 8);
      body.setCollideWorldBounds(true);
    }
  }

  public move(direction: Readonly<Vector2Value>): void {
    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
  }

  public face(direction: Readonly<Vector2Value>): void {
    this.setRotation(Math.atan2(direction.y, direction.x));
  }

  public receiveDamage(amount: number): boolean {
    this.currentHp = Math.max(0, this.currentHp - amount);
    return this.currentHp === 0;
  }

  public canReceiveContactDamage(now: number): boolean {
    return this.currentHp > 0 && !this.invulnerability.isActive(now);
  }

  public beginInvulnerability(now: number, durationMs: number): void {
    this.invulnerability.activate(now, durationMs);
  }
}

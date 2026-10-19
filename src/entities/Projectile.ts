import Phaser from 'phaser';

import type { AttackData } from '../combat/damage';
import { HitRegistry } from '../combat/HitRegistry';
import { ARROW_TEXTURE_KEY } from '../config/constants';
import { ARENA_BOUNDS } from '../config/gameplay';
import type { Vector2Value } from '../input/vectorMath';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public readonly attack: AttackData;
  private remainingPiercing: number;
  private readonly hitRegistry = new HitRegistry();

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: Readonly<Vector2Value>,
    speed: number,
    attack: Readonly<AttackData>,
    piercing: number,
  ) {
    super(scene, x, y, ARROW_TEXTURE_KEY);

    this.attack = { ...attack };
    this.remainingPiercing = piercing;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(15);
    this.setRotation(Math.atan2(direction.y, direction.x));
    this.setVelocity(direction.x * speed, direction.y * speed);

    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setSize(18, 6, true);
      body.setAllowGravity(false);
    }
  }

  public registerHit(targetId: string): boolean {
    if (!this.active || !this.hitRegistry.claim(targetId)) {
      return false;
    }

    if (this.remainingPiercing === 0) {
      this.destroy();
    } else {
      this.remainingPiercing -= 1;
    }

    return true;
  }

  public isOutsideArena(): boolean {
    return (
      this.x < ARENA_BOUNDS.x ||
      this.x > ARENA_BOUNDS.x + ARENA_BOUNDS.width ||
      this.y < ARENA_BOUNDS.y ||
      this.y > ARENA_BOUNDS.y + ARENA_BOUNDS.height
    );
  }
}

import Phaser from 'phaser';
import type { AttackData } from '../combat/damage';
import { ARENA_BOUNDS } from '../config/gameplay';

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  public readonly attack: Readonly<AttackData>;
  public constructor(
    scene: Phaser.Scene, x: number, y: number,
    dx: number, dy: number, speed: number, damage: number,
    color: number = 0xfb7185,
  ) {
    super(scene, x, y, 'enemy-bullet');
    this.attack = { damage, criticalChance: 0, criticalMultiplier: 1 };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(17);
    this.setTint(color);
    this.setRotation(Math.atan2(dy, dx));
    const length = Math.hypot(dx, dy) || 1;
    this.setVelocity(dx / length * speed, dy / length * speed);
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(6, 2, 2);
      body.setAllowGravity(false);
    }
  }
  public isOutsideArena(): boolean {
    return this.x < ARENA_BOUNDS.x || this.x > ARENA_BOUNDS.x + ARENA_BOUNDS.width ||
      this.y < ARENA_BOUNDS.y || this.y > ARENA_BOUNDS.y + ARENA_BOUNDS.height;
  }
}

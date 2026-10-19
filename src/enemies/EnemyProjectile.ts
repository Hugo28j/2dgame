import Phaser from 'phaser';
import type { AttackData } from '../combat/damage';

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
    const bounds = this.scene.physics.world.bounds;
    return this.x < bounds.x || this.x > bounds.right ||
      this.y < bounds.y || this.y > bounds.bottom;
  }
}

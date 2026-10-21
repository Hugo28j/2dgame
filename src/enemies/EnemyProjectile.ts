import Phaser from 'phaser';
import type { AttackData } from '../combat/damage';
export type EnemyProjectileEffect = 'none' | 'frost-chill' | 'frost-burst';

export class EnemyProjectile extends Phaser.Physics.Arcade.Sprite {
  public readonly attack: Readonly<AttackData>;
  public readonly effect: EnemyProjectileEffect;
  private readonly baseVelocity: { x: number; y: number };
  public constructor(
    scene: Phaser.Scene, x: number, y: number,
    dx: number, dy: number, speed: number, damage: number,
    color: number = 0xfb7185, effect: EnemyProjectileEffect = 'none',
  ) {
    super(scene, x, y, 'enemy-bullet');
    this.attack = { damage, criticalChance: 0, criticalMultiplier: 1 };
    this.effect = effect;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(17);
    this.setTint(color);
    if (effect === 'frost-chill') {
      // A real small snowball, instead of the generic colored arrow/bullet.
      const key = 'frost-ranger-mini-snowball';
      if (!scene.textures.exists(key)) {
        const g = scene.add.graphics();
        g.fillStyle(0x93c5fd, .65); g.fillCircle(10, 10, 9);
        g.fillStyle(0xe0f2fe); g.fillCircle(10, 10, 6);
        g.fillStyle(0xffffff); g.fillCircle(7, 7, 2.5);
        g.lineStyle(1.5, 0x38bdf8); g.strokeCircle(10, 10, 7);
        g.generateTexture(key, 20, 20); g.destroy();
      }
      this.setTexture(key).clearTint();
      scene.tweens.add({ targets: this, angle: '+=360', duration: 1000,
        repeat: -1, onUpdate: () => { if (!this.active) scene.tweens.killTweensOf(this); } });
    }
    if (effect === 'frost-burst') this.setScale(1.65);
    this.setRotation(Math.atan2(dy, dx));
    const length = Math.hypot(dx, dy) || 1;
    this.baseVelocity = { x: dx / length * speed, y: dy / length * speed };
    this.setVelocity(this.baseVelocity.x, this.baseVelocity.y);
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(6, 2, 2);
      body.setAllowGravity(false);
    }
  }
  /** Temporarily slow only enemy bullets; restore their exact original speed afterwards. */
  public setSlowMotion(factor: number): void {
    this.setVelocity(this.baseVelocity.x * factor, this.baseVelocity.y * factor);
  }

  public isOutsideArena(): boolean {
    const bounds = this.scene.physics.world.bounds;
    return this.x < bounds.x || this.x > bounds.right ||
      this.y < bounds.y || this.y > bounds.bottom;
  }
}

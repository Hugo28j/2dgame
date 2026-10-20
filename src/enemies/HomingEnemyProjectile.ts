import Phaser from 'phaser';
import { EnemyProjectile } from './EnemyProjectile';
import { HOMING_ORB, orbExpired, steerHomingHeading, type Point2D } from './frozenBossAttacks';

/** Long-lived frozen seeker that follows the player instead of a fixed bullet vector.
 * It still participates in existing collision, slow-motion and cleanup groups.
 */
export class HomingEnemyProjectile extends EnemyProjectile {
  private heading: number;
  private readonly startedAt: number;
  private slowedFactor = 1;

  public constructor(scene: Phaser.Scene, x: number, y: number,
    toward: Readonly<Point2D>, damage: number) {
    const angle = Math.atan2(toward.y - y, toward.x - x);
    super(scene, x, y, Math.cos(angle), Math.sin(angle), HOMING_ORB.speed,
      damage, 0x67e8f9);
    this.startedAt = scene.time.now;
    this.heading = angle;
    this.setScale(1.85).setDepth(21);
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(5.8, 2, 2);
      body.setCollideWorldBounds(true, 1, 1);
    }
  }

  public updateHoming(now: number, delta: number, target: Readonly<Point2D>): void {
    if (!this.active) return;
    if (orbExpired(this.startedAt, now)) {
      this.destroy();
      return;
    }
    this.heading = steerHomingHeading(this.heading, this, target, delta);
    this.setRotation(this.heading);
    this.setVelocity(Math.cos(this.heading) * HOMING_ORB.speed * this.slowedFactor,
      Math.sin(this.heading) * HOMING_ORB.speed * this.slowedFactor);
  }

  public override setSlowMotion(factor: number): void {
    this.slowedFactor = factor;
    this.setVelocity(Math.cos(this.heading) * HOMING_ORB.speed * factor,
      Math.sin(this.heading) * HOMING_ORB.speed * factor);
  }
}

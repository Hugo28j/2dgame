import Phaser from 'phaser';
import { getEnemyStatsForRoom, type EnemyKind, type SlimeRuntimeStats } from './enemyConfig';
import { bossPhase, rangedVelocity, withinRadius } from './enemyMovement';
import { Slime } from './Slime';

export type BulletPattern = 'single' | 'double' | 'fan' | 'radial';
export type EnemyFire = (enemy: AdvancedEnemy, pattern: BulletPattern) => void;
export type EnemyExplosion = (enemy: AdvancedEnemy, radius: number) => void;

/** Reuses the phase-3 shared HP, damage, slow and death events for all enemy types. */
export class AdvancedEnemy extends Slime {
  public readonly kind: Exclude<EnemyKind, 'slime'>;
  public readonly stats: Readonly<SlimeRuntimeStats>;
  private nextShotAt = 0;
  private nextSpecialAt = 0;
  private windupEndsAt = 0;
  private dashEndsAt = 0;
  private dashX = 0;
  private dashY = 0;
  private warning?: Phaser.GameObjects.Graphics;
  private readonly orbitSign: -1 | 1;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number,
    kind: Exclude<EnemyKind, 'slime'>, roomNumber: number) {
    const stats = getEnemyStatsForRoom(kind, roomNumber);
    super(scene, id, x, y, stats);
    this.kind = kind;
    this.stats = stats;
    this.orbitSign = id.length % 2 === 0 ? 1 : -1;
    this.setTexture('enemy-' + kind);
    if (kind === 'boss') {
      this.setScale(1.75);
      const body = this.body;
      if (body instanceof Phaser.Physics.Arcade.Body) body.setCircle(21, 3, 3);
    }
    this.nextShotAt = scene.time.now + stats.attackIntervalMs;
    this.nextSpecialAt = scene.time.now + 1500;
  }

  public get isBoss(): boolean { return this.kind === 'boss'; }

  public updateAI(targetX: number, targetY: number, now: number,
    fire: EnemyFire, explode: EnemyExplosion): void {
    if (this.aiState === 'defeated') return;
    super.chase(targetX, targetY);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const speed = this.stats.movementSpeed * this.slowMultiplier;

    switch (this.kind) {
      case 'archer':
      case 'mage': {
        const move = rangedVelocity(this.x, this.y, targetX, targetY, speed,
          this.kind === 'archer' ? 210 : 155, this.orbitSign);
        this.setVelocity(move.x, move.y);
        if (now >= this.nextShotAt) {
          fire(this, this.kind === 'archer' ? 'single' : 'double');
          this.nextShotAt = now + this.stats.attackIntervalMs;
        }
        break;
      }
      case 'tank':
        // Slow, hard-hitting chaser: super.chase already includes obstacle avoidance.
        break;
      case 'charger':
        this.chargeLogic(targetX, targetY, now, distance, speed, 2300);
        break;
      case 'bomber':
        if (this.windupEndsAt > 0) {
          this.setVelocity(0, 0);
          this.drawWarning(95, 0xfb923c);
          if (now >= this.windupEndsAt) {
            this.clearWarning();
            explode(this, 95);
            this.playDefeat();
          }
        } else if (distance < 113 && now >= this.nextSpecialAt) {
          this.windupEndsAt = now + 760;
          this.setVelocity(0, 0);
          this.drawWarning(95, 0xfb923c);
        }
        break;
      case 'boss': {
        const phase = bossPhase(this.healthRatio);
        const move = rangedVelocity(this.x, this.y, targetX, targetY, speed,
          phase === 1 ? 185 : 135, this.orbitSign);
        if (this.windupEndsAt === 0 && this.dashEndsAt === 0) this.setVelocity(move.x, move.y);
        if (now >= this.nextShotAt && this.windupEndsAt === 0 && this.dashEndsAt === 0) {
          fire(this, phase === 1 ? 'fan' : 'radial');
          this.nextShotAt = now + this.stats.attackIntervalMs * (phase === 2 ? 0.7 : 1);
        }
        this.chargeLogic(targetX, targetY, now, distance, speed,
          phase === 2 ? 3200 : 4900);
        break;
      }
    }
  }

  private chargeLogic(targetX: number, targetY: number, now: number,
    distance: number, speed: number, rechargeMs: number): void {
    if (this.dashEndsAt > 0) {
      if (now < this.dashEndsAt) {
        this.setVelocity(this.dashX * (this.isBoss ? 360 : 430) * this.slowMultiplier,
          this.dashY * (this.isBoss ? 360 : 430) * this.slowMultiplier);
        return;
      }
      this.dashEndsAt = 0;
      this.setVelocity(0, 0);
      this.nextSpecialAt = now + rechargeMs;
      return;
    }
    if (this.windupEndsAt > 0) {
      this.setVelocity(0, 0);
      this.drawWarning(70, 0xef4444);
      if (now >= this.windupEndsAt) {
        this.clearWarning();
        this.dashEndsAt = now + 360;
      }
      return;
    }
    if (now >= this.nextSpecialAt && distance < (this.isBoss ? 360 : 230)) {
      const direction = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y).normalize();
      this.dashX = direction.x;
      this.dashY = direction.y;
      this.windupEndsAt = now + (this.isBoss ? 770 : 540);
      this.setVelocity(0, 0);
      this.drawWarning(70, 0xef4444);
    } else if (this.kind === 'charger') {
      // Chase until charge can start.
      this.setVelocity(this.body instanceof Phaser.Physics.Arcade.Body ?
        this.body.velocity.x : 0, this.body instanceof Phaser.Physics.Arcade.Body ?
        this.body.velocity.y : speed);
    }
  }

  private drawWarning(radius: number, color: number): void {
    if (!this.warning) this.warning = this.scene.add.graphics().setDepth(25);
    this.warning.clear();
    this.warning.lineStyle(3, color, 0.85);
    this.warning.strokeCircle(this.x, this.y, radius);
    this.warning.fillStyle(color, 0.11);
    this.warning.fillCircle(this.x, this.y, radius);
    if (this.kind !== 'bomber') {
      this.warning.lineStyle(5, color, 0.7);
      this.warning.lineBetween(this.x, this.y,
        this.x + this.dashX * 135, this.y + this.dashY * 135);
    }
  }
  private clearWarning(): void {
    this.windupEndsAt = 0;
    this.warning?.destroy();
    this.warning = undefined;
  }
  public override playDefeat(): void {
    this.clearWarning();
    super.playDefeat();
  }
  public override destroy(fromScene?: boolean): void {
    this.warning?.destroy();
    this.warning = undefined;
    super.destroy(fromScene);
  }
}

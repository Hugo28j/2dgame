import type { WorldId } from '../worlds/worldConfig';
import Phaser from 'phaser';
import { getEnemyStatsForRoom, type EnemyKind, type SlimeRuntimeStats } from './enemyConfig';
import { bossPhase, rangedVelocity } from './enemyMovement';
import { Slime } from './Slime';
import { getObstacleAvoidanceVelocity } from './slimeMovement';
import { getBossPlan, getBossProfile } from './bossProfiles';
import type { BulletPattern } from './projectilePatterns';
export type { BulletPattern } from './projectilePatterns';

export type EnemyFire = (enemy: AdvancedEnemy, pattern: BulletPattern, volley?: number, speed?: number) => void;
export type EnemyExplosion = (enemy: AdvancedEnemy, radius: number) => void;
export type EnemyBomb = (enemy: AdvancedEnemy, targetX: number, targetY: number,
  count: number, radius: number, windupMs: number) => void;

/** Reuses the phase-3 shared HP, damage, slow and death events for all enemy types. */
export class AdvancedEnemy extends Slime {
  public readonly kind: Exclude<EnemyKind, 'slime'>;
  public readonly stats: Readonly<SlimeRuntimeStats>;
  private nextShotAt = 0;
  private bossVolleys = 0;
  private readonly roomNumber: number;
  private nextSpecialAt = 0;
  private windupEndsAt = 0;
  private dashEndsAt = 0;
  private dashX = 0;
  private dashY = 0;
  private warning?: Phaser.GameObjects.Graphics;
  private readonly orbitSign: -1 | 1;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number,
    kind: Exclude<EnemyKind, 'slime'>, roomNumber: number,
    worldId: WorldId = 1) {
    const stats = getEnemyStatsForRoom(kind, roomNumber, worldId);
    super(scene, id, x, y, stats);
    this.kind = kind;
    this.roomNumber = roomNumber;
    this.stats = stats;
    this.orbitSign = id.length % 2 === 0 ? 1 : -1;
    this.setTexture('enemy-' + kind);
    if (kind === 'boss') {
      this.setScale(1.75);
      this.setTint(getBossProfile(roomNumber).color);
      const body = this.body;
      if (body instanceof Phaser.Physics.Arcade.Body) body.setCircle(21, 3, 3);
    }
    this.nextShotAt = scene.time.now + stats.attackIntervalMs;
    this.nextSpecialAt = scene.time.now + 1500;
  }

  public get isBoss(): boolean { return this.kind === 'boss'; }

  public updateAI(targetX: number, targetY: number, now: number,
    fire: EnemyFire, explode: EnemyExplosion, dropBombs?: EnemyBomb): void {
    if (this.aiState === 'defeated') return;
    super.chase(targetX, targetY);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const speed = this.stats.movementSpeed * this.slowMultiplier;

    switch (this.kind) {
      case 'archer':
      case 'mage': {
        const move = rangedVelocity(this.x, this.y, targetX, targetY, speed,
          this.kind === 'archer' ? 210 : 155, this.orbitSign);
        const body = this.body;
        const horizontalBlock = body instanceof Phaser.Physics.Arcade.Body &&
          (body.blocked.left || body.blocked.right || body.touching.left || body.touching.right);
        const verticalBlock = body instanceof Phaser.Physics.Arcade.Body &&
          (body.blocked.up || body.blocked.down || body.touching.up || body.touching.down);
        const velocity = horizontalBlock || verticalBlock
          ? getObstacleAvoidanceVelocity(horizontalBlock, targetX - this.x,
              targetY - this.y, speed, this.orbitSign)
          : move;
        this.setVelocity(velocity.x, velocity.y);
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
        this.chargeLogic(targetX, targetY, now, distance, 2300);
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
        const profile = getBossProfile(this.roomNumber);
        const mode = getBossPlan(this.roomNumber, phase, this.bossVolleys);
        const move = rangedVelocity(this.x, this.y, targetX, targetY, speed,
          profile.preferredRange, this.orbitSign);
        if (this.windupEndsAt === 0 && this.dashEndsAt === 0) {
          const body = this.body;
          const blockedX = body instanceof Phaser.Physics.Arcade.Body &&
            (body.blocked.left || body.blocked.right || body.touching.left || body.touching.right);
          const blockedY = body instanceof Phaser.Physics.Arcade.Body &&
            (body.blocked.up || body.blocked.down || body.touching.up || body.touching.down);
          const velocity = blockedX || blockedY
            ? getObstacleAvoidanceVelocity(blockedX, targetX - this.x,
                targetY - this.y, speed, this.orbitSign) : move;
          this.setVelocity(velocity.x, velocity.y);
        }
        if (now >= this.nextShotAt && this.windupEndsAt === 0 && this.dashEndsAt === 0) {
          fire(this, mode.pattern, this.bossVolleys, mode.speed);
          if (mode.bombs > 0 && dropBombs) {
            dropBombs(this, targetX, targetY, mode.bombs, mode.radius, mode.windupMs);
          }
          this.bossVolleys++;
          const scaledInterval = this.stats.attackIntervalMs * mode.tempo;
          this.nextShotAt = now + Math.max(150, scaledInterval);
        }
        // Only explicitly charging bosses use dash logic; other nine archetypes
        // are NOT automatically assigned the old common charge attack.
        if ((mode.dashEvery > 0 && this.bossVolleys > 0 &&
            this.bossVolleys % mode.dashEvery === 0) ||
          this.windupEndsAt > 0 || this.dashEndsAt > 0) {
          this.chargeLogic(targetX, targetY, now, distance,
            phase === 2 ? 2900 : 4400);
        }
        break;
      }
    }
  }

  public override showHit(): void {
    super.showHit();
    if (this.isBoss) {
      this.scene.time.delayedCall(85, () => {
        if (this.active && this.aiState !== 'defeated') {
          this.setTint(getBossProfile(this.roomNumber).color);
        }
      });
    }
  }

  private chargeLogic(targetX: number, targetY: number, now: number,
    distance: number, rechargeMs: number): void {
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
    }
  }

  private drawWarning(radius: number, color: number): void {
    if (!this.warning) this.warning = this.scene.add.graphics().setDepth(25);
    this.warning.clear();
    if (this.kind === 'bomber') {
      this.warning.lineStyle(3, color, 0.85);
      this.warning.strokeCircle(this.x, this.y, radius);
      this.warning.fillStyle(color, 0.16);
      this.warning.fillCircle(this.x, this.y, radius);
      return;
    }
    // Warn about the full dash corridor, not an unrelated circle.
    const reach = (this.isBoss ? 360 : 430) * 0.36;
    const halfWidth = this.isBoss ? 32 : 24;
    const normalX = -this.dashY * halfWidth;
    const normalY = this.dashX * halfWidth;
    const points = [
      { x: this.x + normalX, y: this.y + normalY },
      { x: this.x + this.dashX * reach + normalX, y: this.y + this.dashY * reach + normalY },
      { x: this.x + this.dashX * reach - normalX, y: this.y + this.dashY * reach - normalY },
      { x: this.x - normalX, y: this.y - normalY },
    ];
    const corners = points.map(point => new Phaser.Math.Vector2(point.x, point.y));
    this.warning.fillStyle(color, 0.18);
    this.warning.fillPoints(corners, true);
    this.warning.lineStyle(3, color, 0.9);
    this.warning.strokePoints(corners, true);
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

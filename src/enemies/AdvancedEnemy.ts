import type { WorldId } from '../worlds/worldConfig';
import { getWorldCharacter } from './worldCharacters';
import Phaser from 'phaser';
import { getEnemyStatsForRoom, type EnemyKind, type SlimeRuntimeStats } from './enemyConfig';
import { bossPhase, rangedVelocity } from './enemyMovement';
import { Slime } from './Slime';
import { getChaseVelocity, getObstacleAvoidanceVelocity } from './slimeMovement';
import { coverIsClose, rangedCoverSpot, shieldEndpoints, type ShieldPoint, type ShieldSurface } from './treantShield';
import { getBossPlan, getBossProfile } from './bossProfiles';
import { CHARGER_DASH } from './enemyBalance';
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
  private readonly worldId: WorldId;
  private nextSpecialAt = 0;
  private windupEndsAt = 0;
  private dashEndsAt = 0;
  private dashX = 0;
  private dashY = 0;
  private warning?: Phaser.GameObjects.Graphics;
  private readonly orbitSign: -1 | 1;
  private readonly bossTint: number;
  private shieldGraphic?: Phaser.GameObjects.Graphics;
  private shieldFacingX = 0;
  private shieldFacingY = 1;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number,
    kind: Exclude<EnemyKind, 'slime'>, roomNumber: number,
    worldId: WorldId = 1,
    public readonly bossSlot = 0) {
    const stats = getEnemyStatsForRoom(kind, roomNumber, worldId, bossSlot);
    super(scene, id, x, y, stats);
    this.kind = kind;
    this.roomNumber = roomNumber;
    this.worldId = worldId;
    this.stats = stats;
    // Sprite palette is baked into the world-specific texture; white tint preserves detail.
    this.bossTint = 0xffffff;
    this.orbitSign = id.length % 2 === 0 ? 1 : -1;
    this.setTexture(getWorldCharacter(worldId, kind, roomNumber, bossSlot).textureKey);
    if (kind === 'boss') {
      this.setScale(1.75);
      this.setTint(this.bossTint);
      const body = this.body;
      if (body instanceof Phaser.Physics.Arcade.Body) body.setCircle(21, 3, 3);
    }
    if (worldId === 1 && kind === 'tank') {
      this.shieldGraphic = scene.add.graphics().setDepth(13);
    }
    this.nextShotAt = scene.time.now + stats.attackIntervalMs;
    this.nextSpecialAt = scene.time.now + 1500;
  }

  public get isBoss(): boolean { return this.kind === 'boss'; }
  public get isTreantShield(): boolean { return this.kind === 'tank' && this.worldId === 1; }
  public get shieldSurface(): ShieldSurface {
    return { x: this.x, y: this.y, facingX: this.shieldFacingX, facingY: this.shieldFacingY };
  }
  public get isPoisonAlchemist(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 20;
  }
  public get isMossWarden(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 5;
  }

  public updateAI(targetX: number, targetY: number, now: number,
    fire: EnemyFire, explode: EnemyExplosion, dropBombs?: EnemyBomb,
    coverTank?: Readonly<ShieldSurface>): void {
    if (this.aiState === 'defeated') return;
    super.chase(targetX, targetY);
    if (this.isTreantShield) {
      const dx = targetX - this.x, dy = targetY - this.y;
      const length = Math.hypot(dx, dy);
      if (length > 0.001) {
        this.shieldFacingX = dx / length;
        this.shieldFacingY = dy / length;
      }
      this.drawTreantShield();
    }
    if (this.isKnockedBack(now)) return;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const speed = this.stats.movementSpeed * this.slowMultiplier;

    switch (this.kind) {
      case 'archer':
      case 'mage': {
        const move = coverTank && coverIsClose(this, coverTank)
          ? (() => {
              const behind = rangedCoverSpot(coverTank, this.orbitSign);
              const distanceToCover = Math.hypot(behind.x - this.x, behind.y - this.y);
              return distanceToCover < 19 ? { x: 0, y: 0 } :
                getChaseVelocity(this.x, this.y, behind.x, behind.y, speed);
            })()
          : rangedVelocity(this.x, this.y, targetX, targetY, speed,
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
        this.chargeLogic(targetX, targetY, now, distance, CHARGER_DASH.rechargeMs);
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
        const profile = getBossProfile(this.roomNumber, this.bossSlot);
        const mode = getBossPlan(this.roomNumber, phase, this.bossVolleys, this.bossSlot);
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
            this.isMossWarden ? (phase === 2 ? 2050 : 2750) :
              phase === 2 ? 2900 : 4400);
        }
        break;
      }
    }
  }

  /** The drawn plate is the same actual line segment used in damage interception.
   * The green bar above the enemy already represents its entire shield + body HP.
   */
  private drawTreantShield(): void {
    const graphic = this.shieldGraphic;
    if (!graphic || !graphic.active) return;
    const [a, b] = shieldEndpoints(this.shieldSurface);
    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;
    const nx = this.shieldFacingX, ny = this.shieldFacingY;
    graphic.clear();
    graphic.lineStyle(15, 0x243b24, 0.98);
    graphic.lineBetween(a.x, a.y, b.x, b.y);
    graphic.lineStyle(10, 0x826a3f, 1);
    graphic.lineBetween(a.x, a.y, b.x, b.y);
    graphic.lineStyle(6, 0xc6a86c, 0.98);
    graphic.lineBetween(a.x + nx * 2, a.y + ny * 2, b.x + nx * 2, b.y + ny * 2);
    graphic.lineStyle(2.8, 0xd9f99d, 0.85);
    graphic.lineBetween(a.x + nx * 7, a.y + ny * 7, b.x + nx * 7, b.y + ny * 7);
    // A central metal boss plate and two wooden cross-braces.
    graphic.fillStyle(0x647744, 1);
    graphic.fillCircle(centerX + nx * 6, centerY + ny * 6, 9);
    graphic.lineStyle(2, 0xfef3c7, 0.9);
    graphic.strokeCircle(centerX + nx * 6, centerY + ny * 6, 9);
    const integrity = this.healthRatio;
    if (integrity < 0.67) {
      const dx = b.x - a.x, dy = b.y - a.y;
      graphic.lineStyle(2.5, 0x20190d, 0.85);
      graphic.lineBetween(a.x + dx * 0.22, a.y + dy * 0.22,
        centerX - nx * 4, centerY - ny * 4);
      if (integrity < 0.33) graphic.lineBetween(centerX + nx * 3, centerY + ny * 3,
        b.x - dx * 0.14, b.y - dy * 0.14);
    }
  }

  public override showHit(): void {
    super.showHit();
    if (this.isBoss) {
      this.scene.time.delayedCall(85, () => {
        if (this.active && this.aiState !== 'defeated') {
          this.setTint(this.bossTint);
        }
      });
    }
  }

  private chargeLogic(targetX: number, targetY: number, now: number,
    distance: number, rechargeMs: number): void {
    if (this.dashEndsAt > 0) {
      if (now < this.dashEndsAt) {
        const chargeSpeed = this.isBoss ? 360 : CHARGER_DASH.speed;
        this.setVelocity(this.dashX * chargeSpeed * this.slowMultiplier,
          this.dashY * chargeSpeed * this.slowMultiplier);
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
        this.dashEndsAt = now + (this.isMossWarden ? 1080 :
          this.kind === 'charger' ? CHARGER_DASH.durationMs : 360);
      }
      return;
    }
    if (now >= this.nextSpecialAt && distance < (this.isBoss ? 360 : 230)) {
      const direction = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y).normalize();
      this.dashX = direction.x;
      this.dashY = direction.y;
      this.windupEndsAt = now + (this.isMossWarden ? 330 : this.isBoss ? 770 :
        CHARGER_DASH.telegraphMs);
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
    const reach = this.isMossWarden ? 360 * 1.08 :
      this.kind === 'charger' ? CHARGER_DASH.distance : 360 * 0.36;
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
    this.shieldGraphic?.clear();
    this.clearWarning();
    super.playDefeat();
  }
  public override destroy(fromScene?: boolean): void {
    this.shieldGraphic?.destroy();
    this.shieldGraphic = undefined;
    this.warning?.destroy();
    this.warning = undefined;
    super.destroy(fromScene);
  }
}

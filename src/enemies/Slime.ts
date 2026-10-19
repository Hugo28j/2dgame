import Phaser from 'phaser';

import type { AttackData, Damageable } from '../combat/damage';
import { SLIME_TEXTURE_KEY } from '../config/constants';
import type { SlimeRuntimeStats } from './enemyConfig';
import { getChaseVelocity, getObstacleAvoidanceVelocity } from './slimeMovement';

export const ENEMY_SPAWNED_EVENT = 'enemy-spawned';
export const ENEMY_DEFEATED_EVENT = 'enemy-defeated';

export type SlimeAiState = 'chasing' | 'defeated';

export class Slime extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public readonly defense: number;
  public readonly contactAttack: Readonly<AttackData>;
  public readonly attackIntervalMs: number;
  public aiState: SlimeAiState = 'chasing';
  public get healthRatio(): number { return this.currentHp / this.maxHp; }
  public get slowMultiplier(): number { return this.slowFactor; }
  private readonly maxHp: number;
  private readonly movementSpeed: number;
  private readonly avoidanceSign: -1 | 1;
  private avoidanceUntil = 0;
  private avoidanceVelocity = { x: 0, y: 0 };
  private currentHp: number;
  private slowedUntil = 0;
  private slowFactor = 1;
  private readonly healthBar: Phaser.GameObjects.Graphics;

  public constructor(
    scene: Phaser.Scene,
    public readonly enemyId: string,
    x: number,
    y: number,
    stats: Readonly<SlimeRuntimeStats>,
    textureKey = SLIME_TEXTURE_KEY,
  ) {
    super(scene, x, y, textureKey);

    this.defense = stats.defense;
    this.maxHp = stats.maxHp;
    this.currentHp = stats.maxHp;
    this.movementSpeed = stats.movementSpeed;
    this.avoidanceSign = enemyId.length % 2 === 0 ? 1 : -1;
    this.attackIntervalMs = stats.attackIntervalMs;
    this.contactAttack = Object.freeze({
      damage: stats.damage,
      criticalChance: 0,
      criticalMultiplier: 1,
    });

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);

    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(17, 3, 5);
      body.setAllowGravity(false);
      body.setCollideWorldBounds(true);
      body.setBounce(0.15);
    }

    this.healthBar = scene.add.graphics().setDepth(12);
    this.drawHealthBar();
    scene.events.emit(ENEMY_SPAWNED_EVENT, this);
  }

  public chase(targetX: number, targetY: number): void {
    if (this.aiState !== 'chasing') {
      this.setVelocity(0, 0);
      return;
    }

    const now = this.scene.time.now;
    if (this.slowFactor !== 1 && now >= this.slowedUntil) {
      this.slowFactor = 1;
      this.clearTint();
    }
    const currentSpeed = this.movementSpeed * this.slowFactor;
    const body = this.body;
    const blockedHorizontally =
      body instanceof Phaser.Physics.Arcade.Body && (body.blocked.left || body.blocked.right);
    const blockedVertically =
      body instanceof Phaser.Physics.Arcade.Body && (body.blocked.up || body.blocked.down);

    if (this.scene.time.now >= this.avoidanceUntil && (blockedHorizontally || blockedVertically)) {
      this.avoidanceVelocity = getObstacleAvoidanceVelocity(
        blockedHorizontally,
        targetX - this.x,
        targetY - this.y,
        currentSpeed,
        this.avoidanceSign,
      );
      this.avoidanceUntil = this.scene.time.now + 420;
    }

    const velocity = this.scene.time.now < this.avoidanceUntil
      ? this.avoidanceVelocity
      : getChaseVelocity(
          this.x,
          this.y,
          targetX,
          targetY,
          currentSpeed,
        );
    this.setVelocity(velocity.x, velocity.y);
    this.setFlipX(velocity.x < 0);
    this.drawHealthBar();
  }

  /** A timed, refreshable slow that never affects defeated enemies. */
  public applySlow(now: number, durationMs: number, factor: number): void {
    if (this.aiState === 'defeated' || durationMs <= 0) return;
    if (this.slowedUntil <= now) this.slowFactor = 1;
    this.slowFactor = Math.min(this.slowFactor, Math.max(0.1, Math.min(1, factor)));
    this.slowedUntil = Math.max(this.slowedUntil, now + durationMs);
    this.avoidanceUntil = 0;
    this.setTint(0x67e8f9);
  }

  public receiveDamage(amount: number): boolean {
    if (this.aiState === 'defeated') {
      return true;
    }

    this.currentHp = Math.max(0, this.currentHp - amount);
    this.drawHealthBar();
    return this.currentHp === 0;
  }

  public showHit(): void {
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.active && this.aiState === 'chasing') {
        if (this.scene.time.now < this.slowedUntil) this.setTint(0x67e8f9);
        else this.clearTint();
      }
    });
  }

  public playDefeat(): void {
    if (this.aiState === 'defeated') {
      return;
    }

    this.aiState = 'defeated';
    this.healthBar.clear();
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.enable = false;
    }
    this.scene.events.emit(ENEMY_DEFEATED_EVENT, this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.55,
      scaleY: 0.35,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  public override destroy(fromScene?: boolean): void {
    this.healthBar.destroy();
    super.destroy(fromScene);
  }

  private drawHealthBar(): void {
    const width = 40;
    const ratio = this.currentHp / this.maxHp;
    this.healthBar.clear();
    this.healthBar.fillStyle(0x020617, 0.9);
    this.healthBar.fillRoundedRect(this.x - width / 2, this.y - 29, width, 6, 2);
    this.healthBar.fillStyle(0x84cc16, 1);
    this.healthBar.fillRoundedRect(this.x - width / 2 + 1, this.y - 28, (width - 2) * ratio, 4, 1);
  }
}

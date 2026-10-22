import Phaser from 'phaser';

import type { AttackData, Damageable } from '../combat/damage';
import { SLIME_TEXTURE_KEY } from '../config/constants';
import type { SlimeRuntimeStats } from './enemyConfig';
import { getChaseVelocity, getObstacleAvoidanceVelocity } from './slimeMovement';
import { goblinKnifeAngle, goblinKnifeSwingActive,
  GOBLIN_KNIFE_TOTAL_MS } from './goblinKnife';

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
  private stunnedUntil = 0;
  private knockedUntil = 0;
  private knockbackX = 0;
  private knockbackY = 0;
  /** World-1 goblin holds a real, individually animated knife. */
  public readonly isKnifeGoblin: boolean;
  private readonly knifeGraphic?: Phaser.GameObjects.Graphics;
  private knifeAttackStartedAt = -100000;
  private knifeAttackToken = 0;

  public constructor(
    scene: Phaser.Scene,
    public readonly enemyId: string,
    x: number,
    y: number,
    stats: Readonly<SlimeRuntimeStats>,
    textureKey = SLIME_TEXTURE_KEY,
  ) {
    super(scene, x, y, textureKey);
    this.isKnifeGoblin = textureKey === 'world-1-slime';

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
    if (this.isKnifeGoblin) {
      this.knifeGraphic = scene.add.graphics().setDepth(11);
      this.drawGoblinKnife(scene.time.now);
    }
    this.drawHealthBar();
    if (textureKey.startsWith('world-3-')) {
      scene.tweens.add({ targets: this, scaleX: 1.06, scaleY: 0.94,
        duration: 310, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    }
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
    if (this.isKnockedBack(now)) {
      this.setVelocity(this.knockbackX, this.knockbackY);
      this.drawHealthBar();
      return;
    }
    if (now < this.stunnedUntil) {
      this.setVelocity(0, 0);
      this.drawHealthBar();
      return;
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

  /** Render a held steel blade from the actual moving goblin's wrist.
   * Single cached Graphics instance per goblin; never allocate a new effect
   * every attack or paint a static double-knife onto the texture. */
  private drawGoblinKnife(now: number): void {
    const g = this.knifeGraphic;
    if (!g || !g.active || !this.active || this.aiState === 'defeated') return;
    g.clear();
    g.setPosition(this.x, this.y);
    g.setScale(this.flipX ? -1 : 1, 1);
    const elapsed = now - this.knifeAttackStartedAt;
    const swinging = elapsed >= 0 && elapsed < GOBLIN_KNIFE_TOTAL_MS &&
      !this.isStunned(now);
    const angle = goblinKnifeAngle(swinging ? elapsed : -1);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const px = -dy, py = dx;
    const shoulderX = 11, shoulderY = 4, handX = 18, handY = 6;
    // Exposed green forearm and worn bracer remain attached to the body.
    g.lineStyle(8, 0x487d28, 1);
    g.lineBetween(shoulderX, shoulderY, handX, handY);
    g.lineStyle(5, 0x80502d, 1);
    g.lineBetween(handX - dx * 3, handY - dy * 3, handX + dx * 6, handY + dy * 6);
    g.fillStyle(0x88bf44, 1);
    g.fillCircle(handX, handY, 4.4);
    // Wrapped leather grip, iron crossguard and broad triangular steel blade.
    const guardX = handX + dx * 13, guardY = handY + dy * 13;
    const tipX = handX + dx * 37, tipY = handY + dy * 37;
    g.lineStyle(5.5, 0x35261f, 1);
    g.lineBetween(handX, handY, guardX, guardY);
    g.lineStyle(2.4, 0xd19b5b, 1);
    g.lineBetween(handX + dx * 3, handY + dy * 3,
      handX + dx * 9, handY + dy * 9);
    g.lineStyle(4, 0xae824c, 1);
    g.lineBetween(guardX + px * 7, guardY + py * 7,
      guardX - px * 7, guardY - py * 7);
    g.fillStyle(0x627489, 1);
    g.fillTriangle(tipX, tipY,
      guardX + px * 6, guardY + py * 6,
      guardX - px * 6, guardY - py * 6);
    g.fillStyle(0xcbd9e4, 1);
    g.fillTriangle(tipX, tipY,
      guardX + px * 2.6, guardY + py * 2.6,
      guardX + dx * 6, guardY + dy * 6);
    g.lineStyle(1.6, 0xf8fafc, .88);
    g.lineBetween(guardX + px * 2.6, guardY + py * 2.6, tipX, tipY);
    if (swinging && goblinKnifeSwingActive(elapsed)) {
      // A brief curved cut travels with the real sword hand and its blade.
      const strength = Math.sin(Math.PI * (elapsed - 145) / (320 - 145));
      g.lineStyle(3.6, 0xfde68a, Math.max(0, strength * .86));
      g.beginPath();
      g.arc(handX, handY, 41, angle - .30, angle + .07, false);
      g.strokePath();
      g.fillStyle(0xfff6cf, Math.max(0, strength));
      g.fillCircle(tipX, tipY, 2.5);
    }
  }

  public override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    // Scene-clock time freezes during the pause menu; graphics freeze with it.
    if (this.isKnifeGoblin) this.drawGoblinKnife(this.scene.time.now);
  }

  /** Each goblin has its own winding-up knife swing and impact callback.
   * The returned token cancels a pending hit if stun or death interrupts it. */
  public beginKnifeAttack(now: number): number | null {
    if (!this.isKnifeGoblin || !this.active || this.aiState !== 'chasing' ||
        this.isStunned(now)) return null;
    if (now - this.knifeAttackStartedAt < GOBLIN_KNIFE_TOTAL_MS) return null;
    this.knifeAttackStartedAt = now;
    this.knifeAttackToken += 1;
    this.drawGoblinKnife(now);
    return this.knifeAttackToken;
  }

  public knifeAttackIsValid(token: number, now: number): boolean {
    return this.isKnifeGoblin && this.active && this.aiState === 'chasing' &&
      this.knifeAttackToken === token && !this.isStunned(now) &&
      now - this.knifeAttackStartedAt >= 0 &&
      now - this.knifeAttackStartedAt <= GOBLIN_KNIFE_TOTAL_MS;
  }

  /** Expose this mob's stun deadline to its own attack scheduler only. */
  public get stunEndsAt(): number { return this.stunnedUntil; }
  public isStunned(now: number): boolean { return this.aiState === 'chasing' && now < this.stunnedUntil; }

  public applyStun(now: number, durationMs: number): void {
    if (this.aiState !== 'chasing' || durationMs <= 0) return;
    this.stunnedUntil = Math.max(this.stunnedUntil, now + durationMs);
    if (this.isKnifeGoblin) {
      this.knifeAttackToken += 1; // cancel an unfinished stab
      this.knifeAttackStartedAt = -100000;
    }
    this.setVelocity(0, 0);
    this.setTint(0xfde68a);
  }

  public isKnockedBack(now: number): boolean {
    return this.aiState === 'chasing' && now < this.knockedUntil;
  }

  /** Knockback persists across enemy AI frames, rather than being overwritten on the next chase. */
  public applyKnockback(now: number, durationMs: number, x: number, y: number, speed: number): void {
    if (this.aiState === 'defeated') return;
    const length = Math.hypot(x, y);
    if (length <= 0 || durationMs <= 0) return;
    this.knockbackX = x / length * speed;
    this.knockbackY = y / length * speed;
    this.knockedUntil = now + durationMs;
    this.avoidanceUntil = 0;
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
    this.playEmberHitFx();
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.active && this.aiState === 'chasing') {
        if (this.scene.time.now < this.slowedUntil) this.setTint(0x67e8f9);
        else this.clearTint();
      }
    });
  }

  /** Cinematic bosses may remain on-screen after their gameplay death. */
  protected keepBodyOnDefeat(): boolean { return false; }

  public playDefeat(): void {
    if (this.aiState === 'defeated') {
      return;
    }

    this.aiState = 'defeated';
    this.knifeAttackToken += 1;
    this.knifeGraphic?.destroy();
    this.playEmberDeathFx();
    this.healthBar.clear();
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.enable = false;
    }
    this.scene.events.emit(ENEMY_DEFEATED_EVENT, this);
    if (this.keepBodyOnDefeat()) {
      this.setVelocity(0, 0);
      return;
    }

    // Stop idle/squash loops so the one-shot death animation owns the scale.
    this.scene.tweens.killTweensOf(this);
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
    this.knifeGraphic?.destroy();
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

  private isEmberEnemy(): boolean { return this.texture.key.startsWith('world-3-'); }

  private playEmberHitFx(): void {
    if (!this.isEmberEnemy()) return;
    const ring = this.scene.add.circle(this.x, this.y, 8, 0xfbbf24, 0.28)
      .setStrokeStyle(2, 0xffedd5, 0.9).setDepth(27);
    this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 135,
      onComplete: () => ring.destroy() });
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + this.scene.time.now / 180;
      const spark = this.scene.add.circle(this.x, this.y, 2.5, i === 0 ? 0xfef08a : 0xf97316)
        .setDepth(28);
      this.scene.tweens.add({ targets: spark, x: this.x + Math.cos(angle) * 20,
        y: this.y + Math.sin(angle) * 20, alpha: 0, duration: 170,
        onComplete: () => spark.destroy() });
    }
  }

  private playEmberDeathFx(): void {
    if (!this.isEmberEnemy()) return;
    const flash = this.scene.add.circle(this.x, this.y, 15, 0xf97316, 0.55)
      .setStrokeStyle(3, 0xfef08a).setDepth(28);
    this.scene.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 300,
      onComplete: () => flash.destroy() });
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const ember = this.scene.add.circle(this.x, this.y, 3 + i % 2, i % 3 ? 0xea580c : 0xfde047)
        .setDepth(29);
      this.scene.tweens.add({ targets: ember, x: this.x + Math.cos(angle) * (30 + i * 2),
        y: this.y + Math.sin(angle) * (30 + i * 2) - 8, alpha: 0,
        duration: 280 + i * 18, onComplete: () => ember.destroy() });
    }
  }
}

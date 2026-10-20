import Phaser from 'phaser';
import type { AttackData } from '../combat/damage';
import { addAndLaunch } from '../combat/launchProjectile';
import { Projectile } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import type { Slime } from '../enemies/Slime';
import type { Vector2Value } from '../input/vectorMath';
import { fireIntervalMs, getWeaponStats, type WeaponId } from './weaponConfig';
import { isInsideMeleeSwing } from './meleeCombat';

export class WeaponController {
  private nextShotAt = 0;
  public extraProjectiles = 0;
  public extraPiercing = 0;
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Player,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly weaponId: WeaponId,
    private readonly upgradeLevel: number,
    private readonly permanentDamage = 0,
    private readonly permanentSpeed = 1,
    private readonly meleeTargets?: Phaser.Physics.Arcade.Group,
    private readonly onMeleeHit?: (target: Slime, attack: Readonly<AttackData>) => void,
  ) {}
  public get config() { return getWeaponStats(this.weaponId, this.upgradeLevel); }
  public update(time: number, firing: boolean, direction: Readonly<Vector2Value>): void {
    if (!firing || time < this.nextShotAt) return;
    const config = this.config;
    if (config.attackMode === 'melee') this.swing(direction);
    else this.fire(direction);
    this.nextShotAt = time + fireIntervalMs(config.fireRate * this.owner.attackSpeedAt(time) * this.permanentSpeed);
  }
  private fire(direction: Readonly<Vector2Value>): void {
    const config = this.config;
    const attack = this.createAttack();
    for (let index = 0; index < config.projectileCount + this.extraProjectiles; index += 1) {
      const count = config.projectileCount + this.extraProjectiles;
      const spread = count > 1 ? (index - (count - 1) / 2) * 0.16 : 0;
      const angle = Math.atan2(direction.y, direction.x) + spread;
      const vector = { x: Math.cos(angle), y: Math.sin(angle) };
      const distance = 29;
      const projectile = new Projectile(
        this.scene,
        this.owner.x + vector.x * distance,
        this.owner.y + vector.y * distance,
        vector, config.projectileSpeed, attack, config.piercing + this.extraPiercing,
        { textureKey: config.textureKey, range: config.projectileRange, effect: config.effect },
      );
      addAndLaunch(projectile, () => this.projectiles.add(projectile), vector, config.projectileSpeed);
    }
  }

  private swing(direction: Readonly<Vector2Value>): void {
    const config = this.config;
    const attack = this.createAttack();
    for (const child of this.meleeTargets?.getChildren() ?? []) {
      const target = child as Slime;
      if (!target.active || target.aiState === 'defeated' ||
        !isInsideMeleeSwing(this.owner, direction, target, config.meleeRange, config.meleeArc)) continue;
      this.onMeleeHit?.(target, attack);
      if (config.specialEffects.includes('knockback') &&
        target.active && target.aiState !== 'defeated') {
        // Enemy AI respects the timed knockback, so the next chase frame
        // cannot immediately cancel the push.
        target.applyKnockback(this.scene.time.now, 240,
          direction.x, direction.y, 285);
      }
    }

    const angle = Math.atan2(direction.y, direction.x);
    if (this.weaponId === 'sunblade') {
      this.animateDawnbladeWhoosh(angle, config.meleeArc, config.meleeRange, config.color);
      return;
    }
    const arc = this.scene.add.arc(this.owner.x, this.owner.y, config.meleeRange,
      Phaser.Math.RadToDeg(angle - config.meleeArc / 2),
      Phaser.Math.RadToDeg(angle + config.meleeArc / 2), false, config.color, 0.2)
      .setStrokeStyle(5, config.color, 0.95).setDepth(24);
    this.scene.tweens.add({ targets: arc, alpha: 0, scale: 1.08, duration: 150,
      onComplete: () => arc.destroy() });
  }

  /** A short, travelling crescent rather than a static sector that lingers. */
  private animateDawnbladeWhoosh(
    angle: number, arcWidth: number, radius: number, color: number,
  ): void {
    const slash = this.scene.add.graphics().setDepth(26);
    const start = angle - arcWidth / 2;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 105, ease: 'Cubic.easeOut',
      onUpdate: tween => {
        const progress = tween.getValue() ?? 0;
        const head = start + arcWidth * progress;
        const tail = Math.max(start, head - arcWidth * 0.42);
        const alpha = Math.min(1, (1 - progress) * 1.65);
        slash.clear();

        // Layered, tapered curved streaks with a bright sweeping blade edge.
        slash.lineStyle(17, color, 0.25 * alpha);
        slash.beginPath();
        slash.arc(this.owner.x, this.owner.y, radius - 7, tail, head);
        slash.strokePath();

        slash.lineStyle(7, 0xfff3c4, 0.82 * alpha);
        slash.beginPath();
        slash.arc(this.owner.x, this.owner.y, radius - 2,
          Math.max(tail, head - arcWidth * 0.29), head);
        slash.strokePath();

        slash.lineStyle(3, 0xffffff, 0.95 * alpha);
        slash.beginPath();
        slash.arc(this.owner.x, this.owner.y, radius,
          Math.max(tail, head - arcWidth * 0.16), head);
        slash.strokePath();

        // The small glint at the moving tip reinforces the whoosh direction.
        slash.fillStyle(0xffffff, 0.8 * alpha);
        slash.fillCircle(
          this.owner.x + Math.cos(head) * radius,
          this.owner.y + Math.sin(head) * radius, 3);
      },
      onComplete: () => slash.destroy(),
    });
  }

  private createAttack(): AttackData {
    const config = this.config;
    const magicBonus = this.owner.heroId === 'mage' &&
      (config.effect === 'magic' || config.effect === 'chain-lightning') ? 1.2 : 1;
    return {
      damage: (config.damage + this.permanentDamage + this.owner.damage) * magicBonus,
      criticalChance: this.owner.criticalChance + config.criticalChanceModifier,
      criticalMultiplier: Math.max(this.owner.criticalMultiplier, config.criticalMultiplier),
    };
  }
}

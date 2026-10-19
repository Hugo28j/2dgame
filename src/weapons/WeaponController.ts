import Phaser from 'phaser';
import type { AttackData } from '../combat/damage';
import { addAndLaunch } from '../combat/launchProjectile';
import { Projectile } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import type { Vector2Value } from '../input/vectorMath';
import { fireIntervalMs, getWeaponStats, type WeaponId } from './weaponConfig';

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
  ) {}
  public get config() { return getWeaponStats(this.weaponId, this.upgradeLevel); }
  public update(time: number, firing: boolean, direction: Readonly<Vector2Value>): void {
    if (!firing || time < this.nextShotAt) return;
    const config = this.config;
    this.fire(direction);
    this.nextShotAt = time + fireIntervalMs(config.fireRate * this.owner.attackSpeed * this.permanentSpeed);
  }
  private fire(direction: Readonly<Vector2Value>): void {
    const config = this.config;
    const magicBonus = this.owner.heroId === 'mage' &&
      (config.effect === 'magic' || config.effect === 'chain-lightning') ? 1.2 : 1;
    const attack: AttackData = {
      damage: (config.damage + this.permanentDamage + this.owner.damage) * magicBonus,
      criticalChance: this.owner.criticalChance + config.criticalChanceModifier,
      criticalMultiplier: this.owner.criticalMultiplier,
    };
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
}

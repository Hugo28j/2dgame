import Phaser from 'phaser';

import type { Damageable } from '../combat/damage';
import { InvulnerabilityWindow } from '../combat/InvulnerabilityWindow';
import { HEROES, getHeroStats, type HeroId } from '../heroes/heroConfig';
import type { Vector2Value } from '../input/vectorMath';

export class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public readonly maxHp: number;
  public readonly defense: number;
  public readonly damage: number;
  public readonly attackSpeed: number;
  public readonly movementSpeed: number;
  public readonly criticalChance: number;
  public readonly criticalMultiplier: number;
  public readonly abilityCooldownModifier: number;
  public readonly abilityDamageMultiplier: number;
  public currentHp: number;
  private readonly invulnerability = new InvulnerabilityWindow();

  public constructor(
    scene: Phaser.Scene, x: number, y: number,
    public readonly heroId: HeroId = 'ranger', level = 1,
  ) {
    super(scene, x, y, HEROES[heroId].textureKey);
    const stats = getHeroStats(heroId, level);
    this.maxHp = stats.maxHp;
    this.currentHp = stats.maxHp;
    this.defense = stats.defense;
    this.damage = stats.damage;
    this.attackSpeed = stats.attackSpeed;
    this.movementSpeed = stats.movementSpeed;
    this.criticalChance = stats.criticalChance;
    this.criticalMultiplier = stats.criticalMultiplier;
    this.abilityCooldownModifier = stats.abilityCooldownModifier;
    this.abilityDamageMultiplier = stats.abilityDamageMultiplier;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(20);
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(16, 8, 8);
      body.setCollideWorldBounds(true);
    }
  }

  public move(direction: Readonly<Vector2Value>): void {
    this.setVelocity(direction.x * this.movementSpeed, direction.y * this.movementSpeed);
  }

  public face(direction: Readonly<Vector2Value>): void {
    this.setRotation(Math.atan2(direction.y, direction.x));
  }

  public receiveDamage(amount: number): boolean {
    this.currentHp = Math.max(0, this.currentHp - amount);
    return this.currentHp === 0;
  }

  public canReceiveContactDamage(now: number): boolean {
    return this.currentHp > 0 && !this.invulnerability.isActive(now);
  }

  public beginInvulnerability(now: number, durationMs: number): void {
    this.invulnerability.activate(now, durationMs);
  }
}

import Phaser from 'phaser';

import type { Damageable } from '../combat/damage';
import { InvulnerabilityWindow } from '../combat/InvulnerabilityWindow';
import { SHIELD_MAX_HP, absorbWithShield } from '../abilities/ShieldHealth';
import { FROZEN_EARLY } from '../enemies/frozenEarlyGame';
import { HEROES, getHeroStats, type HeroId } from '../heroes/heroConfig';
import type { Vector2Value } from '../input/vectorMath';

export class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public maxHp: number;
  public defense: number;
  public damage: number;
  public attackSpeed: number;
  public movementSpeed: number;
  public criticalChance: number;
  public readonly criticalMultiplier: number;
  public abilityCooldownModifier: number;
  public readonly abilityDamageMultiplier: number;
  public currentHp: number;
  public shieldHp = 0;
  public readonly maxShieldHp = SHIELD_MAX_HP;
  private readonly invulnerability = new InvulnerabilityWindow();
  private rapidFireUntil = 0;
  private sprintUntil = 0;
  private chilledUntil = 0;
  private frozenUntil = 0;
  public get isFrozen(): boolean { return this.scene.time.now < this.frozenUntil; }
  public get isChilled(): boolean { return this.scene.time.now < this.chilledUntil; }
  public clearFrost(): void {
    this.chilledUntil = 0;
    this.frozenUntil = 0;
  }

  public chill(now: number): void {
    this.chilledUntil = Math.max(this.chilledUntil, now + FROZEN_EARLY.chillDurationMs);
  }
  public freeze(now: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, now + FROZEN_EARLY.freezeDurationMs);
    this.setVelocity(0, 0);
  }

  public boostAttackSpeed(now: number, durationMs: number): void {
    this.rapidFireUntil = Math.max(this.rapidFireUntil, now + durationMs);
  }

  public boostMovementSpeed(now: number, durationMs: number): void {
    this.sprintUntil = Math.max(this.sprintUntil, now + durationMs);
  }

  public attackSpeedAt(now: number): number {
    return this.attackSpeed * (now < this.rapidFireUntil ? 2.15 : 1);
  }

  public movementSpeedAt(now: number): number {
    if (now < this.frozenUntil) return 0;
    return this.movementSpeed * (now < this.sprintUntil ? 1.65 : 1) *
      (now < this.chilledUntil ? FROZEN_EARLY.chillSpeedFactor : 1);
  }

  public constructor(
    scene: Phaser.Scene, x: number, y: number,
    public readonly heroId: HeroId = 'ranger', level = 1,
    permanent: Readonly<{ hp: number; damage: number; defense: number }> = { hp: 0, damage: 0, defense: 0 },
  ) {
    super(scene, x, y, HEROES[heroId].textureKey);
    this.setDisplaySize(56, 56);
    const stats = getHeroStats(heroId, level);
    this.maxHp = stats.maxHp + permanent.hp;
    this.currentHp = this.maxHp;
    this.defense = stats.defense + permanent.defense;
    this.damage = stats.damage + permanent.damage;
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
      body.setCircle(15, 17, 17);
      body.setCollideWorldBounds(true);
    }
  }

  /** Bonuses are ephemeral and deliberately never written to the save. */
  public applyRunBonus(id: 'damage' | 'attackSpeed' | 'movement' | 'maxHp' | 'healing'
    | 'crit' | 'defense' | 'cooldown'): void {
    switch (id) {
      case 'damage': this.damage *= 1.15; break;
      case 'attackSpeed': this.attackSpeed *= 1.1; break;
      case 'movement': this.movementSpeed *= 1.12; break;
      case 'maxHp': this.maxHp += 20; this.currentHp += 20; break;
      case 'healing': this.currentHp = Math.min(this.maxHp, this.currentHp + 35); break;
      case 'crit': this.criticalChance = Math.min(1, this.criticalChance + 0.06); break;
      case 'defense': this.defense *= 1.15; break;
      case 'cooldown': this.abilityCooldownModifier *= 0.9; break;
    }
  }

  /** Apply permanent hero level changes immediately without losing run bonuses or current HP. */
  public applyHeroLevel(previousLevel: number, nextLevel: number): void {
    const before = getHeroStats(this.heroId, previousLevel);
    const after = getHeroStats(this.heroId, nextLevel);
    const hpGain = after.maxHp - before.maxHp;
    this.maxHp += hpGain;
    this.currentHp = Math.min(this.maxHp, this.currentHp + hpGain);
    this.damage += after.damage - before.damage;
    this.defense += after.defense - before.defense;
  }

  public move(direction: Readonly<Vector2Value>): void {
    const speed = this.movementSpeedAt(this.scene.time.now);
    this.setVelocity(direction.x * speed, direction.y * speed);
  }

  public face(direction: Readonly<Vector2Value>): void {
    this.setRotation(Math.atan2(direction.y, direction.x));
  }

  /** Recover at most the missing HP; dead players cannot be revived by a room clear. */
  public heal(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0 || this.currentHp <= 0) return 0;
    const previous = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    return this.currentHp - previous;
  }

  /** Reapplying the bubble restores 50 HP; it never stacks above its maximum. */
  public restoreShield(): void { this.shieldHp = this.maxShieldHp; }

  public receiveDamage(amount: number): boolean {
    const result = absorbWithShield(this.currentHp, this.shieldHp, amount);
    this.currentHp = result.health;
    this.shieldHp = result.shield;
    return result.defeated;
  }

  public canReceiveContactDamage(now: number): boolean {
    return this.currentHp > 0 && !this.invulnerability.isActive(now);
  }

  public beginInvulnerability(now: number, durationMs: number): void {
    this.invulnerability.activate(now, durationMs);
  }
}

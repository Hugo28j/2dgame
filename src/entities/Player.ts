import Phaser from 'phaser';

import type { Damageable } from '../combat/damage';
import { InvulnerabilityWindow } from '../combat/InvulnerabilityWindow';
import { SHIELD_MAX_HP } from '../abilities/ShieldHealth';
import { applyPlayerHit } from '../combat/playerHitProtection';
import { FROZEN_EARLY, frostMovementFactor } from '../enemies/frozenEarlyGame';
import { HEROES, getHeroStats, type HeroId } from '../heroes/heroConfig';
import type { Vector2Value } from '../input/vectorMath';
import { ICE_PLAYER_STEERING, iceVelocity } from '../worlds/iceMotion';

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
  private rapidFireMultiplier = 2.15;
  private sprintUntil = 0;
  private chilledUntil = 0;
  private witchSlowedUntil = 0;
  private frozenUntil = 0;
  public get isFrozen(): boolean { return this.scene.time.now < this.frozenUntil; }
  public get isChilled(): boolean {
    return this.scene.time.now < this.chilledUntil || this.scene.time.now < this.witchSlowedUntil;
  }
  public clearFrost(): void {
    this.chilledUntil = 0;
    this.witchSlowedUntil = 0;
    this.frozenUntil = 0;
  }

  public chill(now: number): void {
    this.chilledUntil = Math.max(this.chilledUntil, now + FROZEN_EARLY.chillDurationMs);
  }
  /** Witch ice-burst slows for three seconds; it never stops movement. */
  public slowFromWitch(now: number): void {
    this.witchSlowedUntil = Math.max(this.witchSlowedUntil,
      now + FROZEN_EARLY.witchSlowDurationMs);
  }
  public freeze(now: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, now + FROZEN_EARLY.freezeDurationMs);
    this.setVelocity(0, 0);
  }

  public boostAttackSpeed(now: number, durationMs: number, multiplier = 2.15): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0 ||
        !Number.isFinite(multiplier) || multiplier <= 0) return;
    this.rapidFireUntil = Math.max(this.rapidFireUntil, now + durationMs);
    this.rapidFireMultiplier = multiplier;
  }

  public boostMovementSpeed(now: number, durationMs: number): void {
    this.sprintUntil = Math.max(this.sprintUntil, now + durationMs);
  }

  public attackSpeedAt(now: number): number {
    return this.attackSpeed * (now < this.rapidFireUntil ? this.rapidFireMultiplier : 1);
  }

  public movementSpeedAt(now: number): number {
    if (now < this.frozenUntil) return 0;
    // Concurrent Archer and Witch slows never combine into near-paralysis.
    const frostFactor = frostMovementFactor(now, this.chilledUntil, this.witchSlowedUntil);
    return this.movementSpeed * (now < this.sprintUntil ? 1.65 : 1) * frostFactor;
  }

  public constructor(
    scene: Phaser.Scene, x: number, y: number,
    public readonly heroId: HeroId = 'ranger', level = 1,
    private readonly armor: Readonly<{
      hp: number; defense: number; weaponDamage: number; attackSpeed: number; movementSpeed: number;
    }> = { hp: 0, defense: 0, weaponDamage: 0, attackSpeed: 0, movementSpeed: 0 },
  ) {
    super(scene, x, y, HEROES[heroId].textureKey);
    this.setDisplaySize(56, 56);
    const stats = getHeroStats(heroId, level);
    this.maxHp = stats.maxHp * (1 + this.armor.hp);
    this.currentHp = this.maxHp;
    this.defense = stats.defense * (1 + this.armor.defense);
    this.damage = stats.damage;
    this.attackSpeed = stats.attackSpeed;
    this.movementSpeed = stats.movementSpeed * (1 + this.armor.movementSpeed);
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
    const hpGain = (after.maxHp - before.maxHp) * (1 + this.armor.hp);
    this.maxHp += hpGain;
    this.currentHp = Math.min(this.maxHp, this.currentHp + hpGain);
    this.damage += after.damage - before.damage;
    this.defense += (after.defense - before.defense) * (1 + this.armor.defense);
  }

  public move(direction: Readonly<Vector2Value>, deltaMs = 16, onIce = false): void {
    const speed = this.movementSpeedAt(this.scene.time.now);
    const desired = { x: direction.x * speed, y: direction.y * speed };
    if (!onIce || speed === 0) {
      // Only world 2 slides; being frozen must still stop immediately.
      this.setVelocity(desired.x, desired.y);
      return;
    }
    const body = this.body;
    const collision = body instanceof Phaser.Physics.Arcade.Body ? {
      left: body.blocked.left || body.touching.left,
      right: body.blocked.right || body.touching.right,
      up: body.blocked.up || body.touching.up,
      down: body.blocked.down || body.touching.down,
    } : {};
    const velocity = iceVelocity(
      { x: body?.velocity.x ?? 0, y: body?.velocity.y ?? 0 },
      desired, deltaMs, ICE_PLAYER_STEERING, collision,
    );
    this.setVelocity(velocity.x, velocity.y);
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
    // Every hit is applied independently; only explicit skill immunity can block it.
    const result = applyPlayerHit(this.scene.time.now,
      this.currentHp, this.shieldHp, amount, this.invulnerability);
    if (result.accepted) {
      this.currentHp = result.health;
      this.shieldHp = result.shield;
    }
    return result.defeated;
  }

  public canReceiveContactDamage(now: number): boolean {
    return this.currentHp > 0 && !this.invulnerability.isActive(now);
  }

  public beginInvulnerability(now: number, durationMs: number): void {
    this.invulnerability.activate(now, durationMs);
  }
}

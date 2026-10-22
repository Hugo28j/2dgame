import Phaser from 'phaser';

import type { AttackData } from '../combat/damage';
import { HitRegistry } from '../combat/HitRegistry';
import { ARROW_TEXTURE_KEY } from '../config/constants';
import type { Vector2Value } from '../input/vectorMath';
import type { WeaponEffect } from '../weapons/weaponConfig';
import { ICE_SPIKE, iceSpikeCollisionSize } from '../weapons/iceSpike';
import { RUNE_TOME, runeAimTarget, runeRicochetHeading, runeSteer,
  type RuneEnemy, type RunePoint } from '../weapons/runeTome';

export interface ProjectileOptions {
  textureKey?: string;
  range?: number;
  effect?: WeaponEffect;
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public readonly attack: AttackData;
  public readonly effect: WeaponEffect;
  private remainingPiercing: number;
  private readonly hitRegistry = new HitRegistry();
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly maxRange: number;
  private checkedX: number;
  private checkedY: number;
  private readonly iceSpike: boolean;
  public readonly isRuneOrb: boolean;
  /** 0=in flight, 1=first hit registered, 2=traveling to second enemy. */
  private runePhase: 0 | 1 | 2 = 0;
  private runeHeading = 0;
  private runeOriginalHeading = 0;
  private runeSpeed = 0;
  private runeBounceAt = 0;
  private runeBounceEnemyId?: string;
  private runeBounceOrigin?: RunePoint;
  private runeAura?: Phaser.GameObjects.Graphics;
  private runeLastTrailAt = -Infinity;
  private readonly runeTrail: Array<{x:number;y:number;at:number}> = [];
  private iceTrail?: Phaser.GameObjects.Graphics;
  private lastIceTrailAt = -Infinity;
  private readonly iceTrailSamples: Array<{ x: number; y: number; at: number }> = [];

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: Readonly<Vector2Value>,
    speed: number,
    attack: Readonly<AttackData>,
    piercing: number,
    options: Readonly<ProjectileOptions> = {},
  ) {
    super(scene, x, y, options.textureKey ?? ARROW_TEXTURE_KEY);
    this.attack = { ...attack };
    this.remainingPiercing = piercing;
    this.effect = options.effect ?? 'none';
    this.iceSpike = options.textureKey === 'dagger-projectile';
    this.isRuneOrb = options.textureKey === 'rune-projectile';
    this.runeOriginalHeading = Math.atan2(direction.y, direction.x);
    this.runeHeading = this.runeOriginalHeading;
    this.runeSpeed = speed;
    this.spawnX = x;
    this.spawnY = y;
    this.checkedX = x;
    this.checkedY = y;
    this.maxRange = options.range ?? 700;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(15);
    this.setRotation(Math.atan2(direction.y, direction.x));
    this.setVelocity(direction.x * speed, direction.y * speed);
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      if (this.iceSpike) {
        // Only the narrow crystal core can hit. Account for the angle of
        // travel because Phaser Arcade bodies cannot themselves rotate.
        const hitbox = iceSpikeCollisionSize(this.rotation);
        body.setSize(hitbox.width, hitbox.height, true);
      } else if (this.isRuneOrb) {
        // Orb art is roughly 20px wide. The decorative outer glow cannot hit.
        body.setCircle(10, 2, 2);
      } else {
        body.setSize(14, 8, true);
      }
      body.setAllowGravity(false);
    }
    if (this.iceSpike) this.iceTrail = scene.add.graphics().setDepth(14);
    if (this.isRuneOrb) this.runeAura = scene.add.graphics().setDepth(16);
  }

  /** Limited initial steering; once a target is hit, turn toward exactly ONE
   * other enemy and follow it in a visible arc, then die on contact or expiry.
   * The same graphic holds both ring and trail, avoiding particle sprites. */
  public updateRuneFlight(
    now: number, deltaMs: number, enemies: readonly RuneEnemy[],
  ): void {
    if (!this.isRuneOrb || !this.active) return;
    if (this.runePhase === 1) return;
    let target: RuneEnemy | undefined;
    if (this.runePhase === 2) {
      if (now - this.runeBounceAt > RUNE_TOME.bounceMaxDurationMs) {
        this.destroy(); return;
      }
      target = enemies.find(enemy => enemy.enemyId === this.runeBounceEnemyId);
      if (!target) { this.destroy(); return; }
    } else {
      target = runeAimTarget(this, this.runeOriginalHeading, enemies);
    }
    if (target) {
      const desired = Math.atan2(target.y-this.y, target.x-this.x);
      this.runeHeading = runeSteer(this.runeHeading, desired, deltaMs/1000,
        this.runePhase === 2 ? RUNE_TOME.bounceTurnRadiansPerSecond :
          RUNE_TOME.initialTurnRadiansPerSecond,
        this.runePhase === 2 ? undefined : this.runeOriginalHeading);
    }
    this.setVelocity(Math.cos(this.runeHeading)*this.runeSpeed,
      Math.sin(this.runeHeading)*this.runeSpeed);
    // A slowly rotating rune symbol independent of the ball's flight heading.
    this.setRotation(now * 0.0048);
    const g = this.runeAura;
    if (!g?.active) return;
    if (now - this.runeLastTrailAt >= RUNE_TOME.trailSampleMs) {
      this.runeLastTrailAt = now;
      this.runeTrail.push({x:this.x,y:this.y,at:now});
      if (this.runeTrail.length > RUNE_TOME.maxTrailSamples) this.runeTrail.shift();
    }
    g.clear();
    for (let i=0;i<this.runeTrail.length;i++) {
      const sample=this.runeTrail[i]!;
      const alpha=Math.max(0,1-(now-sample.at)/RUNE_TOME.trailLifetimeMs);
      if (alpha<=0) continue;
      const r=2.5+alpha*3;
      g.fillStyle(0x9d8bff,.26*alpha);
      g.fillCircle(sample.x,sample.y,r);
      g.fillStyle(0xecdcff,.7*alpha);
      g.fillCircle(sample.x+Math.sin(i*1.97)*3,
        sample.y+Math.cos(i*1.97)*3,1.5*alpha);
    }
    g.lineStyle(2,0xd8b4fe,.56);
    g.strokeCircle(this.x,this.y,12+Math.sin(now/110)*1.5);
    for (let i=0;i<3;i++) {
      const a=now/260+i*Math.PI*2/3;
      g.fillStyle(0xf5d0fe,.68);
      g.fillCircle(this.x+Math.cos(a)*13,this.y+Math.sin(a)*13,1.8);
    }
  }

  public get runeAwaitingBounce(): boolean {
    return this.isRuneOrb && this.runePhase === 1;
  }

  public get runeSecondHit(): boolean {
    return this.isRuneOrb && this.runePhase === 2;
  }

  public get shieldOrigin(): RunePoint {
    return this.runeBounceOrigin ?? this.launchOrigin;
  }

  /** Called immediately after damage to the primary enemy has been resolved. */
  public beginRuneBounce(target: RuneEnemy | undefined, now: number): boolean {
    if (!this.isRuneOrb || this.runePhase !== 1 || !this.active) return false;
    if (!target) { this.destroy(); return false; }
    this.runePhase = 2;
    this.runeBounceEnemyId = target.enemyId;
    this.runeBounceAt = now;
    this.runeBounceOrigin = {x:this.x,y:this.y};
    // Snap to the second target at the impact, leaving an obvious corner in
    // the persistent rune trail. This is a physical turn, not instant damage.
    this.runeHeading = runeRicochetHeading(this, target);
    this.setVelocity(Math.cos(this.runeHeading) * this.runeSpeed,
      Math.sin(this.runeHeading) * this.runeSpeed);
    return true;
  }

  /** Tiny trail pooled into a single Graphics object per flying ice spike.
   * Capped at five frost samples, and destroyed along with the projectile. */
  public updateIceSpikeTrail(now: number): void {
    if (!this.iceSpike || !this.active || !this.iceTrail?.active) return;
    if (now - this.lastIceTrailAt >= ICE_SPIKE.trailSampleMs) {
      this.lastIceTrailAt = now;
      const tailX = this.x - Math.cos(this.rotation) * 16;
      const tailY = this.y - Math.sin(this.rotation) * 16;
      this.iceTrailSamples.push({ x: tailX, y: tailY, at: now });
      if (this.iceTrailSamples.length > ICE_SPIKE.maxTrailSamples)
        this.iceTrailSamples.shift();
    }
    const g = this.iceTrail;
    g.clear();
    for (let i = 0; i < this.iceTrailSamples.length; i++) {
      const sample = this.iceTrailSamples[i]!;
      const fade = Math.max(0, 1 - (now - sample.at) / ICE_SPIKE.trailLifetimeMs);
      if (fade <= 0) continue;
      // Two small sparkling flecks, offset to either side of the flight path.
      const normalX = -Math.sin(this.rotation);
      const normalY = Math.cos(this.rotation);
      const wobble = 3 + 2 * Math.sin(i * 2.5 + sample.at / 80);
      g.fillStyle(0xb8f4ff, 0.50 * fade);
      g.fillCircle(sample.x + normalX * wobble, sample.y + normalY * wobble, 1.8 * fade);
      g.fillStyle(0xffffff, 0.72 * fade);
      g.fillCircle(sample.x - normalX * wobble, sample.y - normalY * wobble, 1.25 * fade);
    }
  }

  public override destroy(fromScene?: boolean): void {
    this.iceTrail?.destroy();
    this.iceTrail = undefined;
    this.iceTrailSamples.length = 0;
    this.runeAura?.destroy();
    this.runeAura = undefined;
    this.runeTrail.length = 0;
    super.destroy(fromScene);
  }

  /** Where the fired bullet originated, for frontal shield / cover checks. */
  public get launchOrigin(): { x: number; y: number } {
    return { x: this.spawnX, y: this.spawnY };
  }

  /** Ray between consecutive sampled projectile positions catches fast shots
   * that pass through a shield without overlapping a normal enemy body.
   */
  public consumeFlightSegment(): { from: { x: number; y: number }; to: { x: number; y: number } } {
    const from = { x: this.checkedX, y: this.checkedY };
    const to = { x: this.x, y: this.y };
    this.checkedX = this.x;
    this.checkedY = this.y;
    return { from, to };
  }

  public registerHit(targetId: string): boolean {
    if (!this.active) return false;
    if (this.isRuneOrb) {
      if (this.runePhase === 1 ||
        (this.runePhase === 2 && targetId !== this.runeBounceEnemyId)) return false;
      if (!this.hitRegistry.claim(targetId)) return false;
      if (this.runePhase === 0) {
        // Delay destruction while the first damage event selects bounce target.
        this.runePhase = 1;
      } else {
        // The second valid impact always consumes the orb. Never chain again.
        this.destroy();
      }
      return true;
    }
    if (!this.hitRegistry.claim(targetId)) return false;
    if (this.remainingPiercing === 0) this.destroy();
    else this.remainingPiercing -= 1;
    return true;
  }

  public isOutsideArena(): boolean {
    const bounds = this.scene.physics.world.bounds;
    return (
      Math.hypot(this.x - this.spawnX, this.y - this.spawnY) >
        this.maxRange + (this.runePhase === 2 ? RUNE_TOME.bounceExtraRange : 0) ||
      this.x < bounds.x ||
      this.x > bounds.right ||
      this.y < bounds.y ||
      this.y > bounds.bottom
    );
  }
}

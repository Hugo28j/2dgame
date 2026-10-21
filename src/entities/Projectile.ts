import Phaser from 'phaser';

import type { AttackData } from '../combat/damage';
import { HitRegistry } from '../combat/HitRegistry';
import { ARROW_TEXTURE_KEY } from '../config/constants';
import type { Vector2Value } from '../input/vectorMath';
import type { WeaponEffect } from '../weapons/weaponConfig';
import { ICE_SPIKE, iceSpikeCollisionSize } from '../weapons/iceSpike';

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
      } else {
        body.setSize(14, 8, true);
      }
      body.setAllowGravity(false);
    }
    if (this.iceSpike) this.iceTrail = scene.add.graphics().setDepth(14);
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
    if (!this.active || !this.hitRegistry.claim(targetId)) return false;
    if (this.remainingPiercing === 0) this.destroy();
    else this.remainingPiercing -= 1;
    return true;
  }

  public isOutsideArena(): boolean {
    const bounds = this.scene.physics.world.bounds;
    return (
      Math.hypot(this.x - this.spawnX, this.y - this.spawnY) > this.maxRange ||
      this.x < bounds.x ||
      this.x > bounds.right ||
      this.y < bounds.y ||
      this.y > bounds.bottom
    );
  }
}

import { scaleRunWeaponDamage } from '../progression/runUpgrades';
import Phaser from 'phaser';
import type { AttackData } from '../combat/damage';
import { addAndLaunch } from '../combat/launchProjectile';
import { Projectile } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import { Slime } from '../enemies/Slime';
import type { Vector2Value } from '../input/vectorMath';
import { fireIntervalMs, getWeaponStats, WARHAMMER_GROUND_SLAM, type WeaponId } from './weaponConfig';
import { isInsideMeleeSwing } from './meleeCombat';
import { inForwardRectangle, normalizedDirection } from '../abilities/directedGeometry';
import { BIG_WAVE, FLAMETHROWER, bigWaveHitKind, flameConeHits } from './elementalMelee';
import { SHOTGUN_TRANSFORM, shotgunVolleyAngles } from '../abilities/phase9Balance';
import { hasAnimatedHero } from '../heroes/heroEquipmentArt';
import { CharacterAttackArt, HAMMER_IMPACT_DELAY_MS } from '../heroes/characterAttackArt';
import { heroWeaponMuzzleDistance } from '../heroes/heroWeaponProportions';
import { poseLengthMs } from '../heroes/characterAttackPose';
import { RANGER_WEAPON_ANIMATION } from '../heroes/rangerWeaponAnimation';

export class WeaponController {
  private nextShotAt = 0;
  private shotgunUntil = 0;
  private shotgunDamage = 0;
  /** Sustained cone graphics are reused each frame rather than recreated. */
  private flameEffect?: Phaser.GameObjects.Graphics;
  private nextFlameContactAt = 0;
  private readonly burning = new Map<Slime, {
    expiresAt: number; nextTickAt: number; damage: number;
  }>();
  private readonly groundEffects = new Set<Phaser.GameObjects.Graphics>();
  private readonly hammerTimers = new Set<Phaser.Time.TimerEvent>();
  private readonly bowReleaseTimers = new Set<Phaser.Time.TimerEvent>();
  private readonly combatArt?: CharacterAttackArt;
  public extraProjectiles = 0;
  public extraPiercing = 0;
  public extraMeleeRange = 0;
  public meleeStunMs = 0;
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
    private readonly armorDamageMultiplier = 1,
  ) {
    if (hasAnimatedHero(owner.heroId)) {
      this.combatArt = new CharacterAttackArt(scene, owner, weaponId);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.combatArt?.destroy());
    }
  }
  public get attackMode(): 'melee' | 'projectile' { return this.config.attackMode; }
  public get config() { return getWeaponStats(this.weaponId, this.upgradeLevel); }
  /** Transient override: never alters weaponId, weapon level, save data or inventory. */
  public activateShotgunBuff(now: number, damage: number, durationMs: number = SHOTGUN_TRANSFORM.durationMs): boolean {
    if (this.owner.heroId !== 'ranger' || !(durationMs > 0) || !(damage > 0) ||
        !Number.isFinite(now) || now < 0 || now < this.shotgunUntil) return false;
    this.shotgunUntil = now + durationMs;
    this.shotgunDamage = damage;
    this.nextShotAt = now; // The first temporary salvo fires immediately.
    return true;
  }

  public shotgunRemainingMs(now: number): number {
    return Math.max(0, this.shotgunUntil - now);
  }

  public update(time: number, firing: boolean, direction: Readonly<Vector2Value>): void {
    // Unlike discrete shots, Inferno Flamethrower is sustained while held:
    // animate the caster's hands/nozzle continuously without changing its
    // existing 200ms damage ticks, range or burn rules.
    this.combatArt?.setChanneling(this.weaponId === 'fireorbs' && firing);
    this.combatArt?.update(time);
    this.tickBurning(time);
    if (this.shotgunUntil > 0 && time >= this.shotgunUntil) {
      this.shotgunUntil = 0;
      this.shotgunDamage = 0;
      this.nextShotAt = time; // Restore the original selected weapon immediately.
    }
    if (time < this.shotgunUntil) {
      // This short transformation automatically fires while the hero is free
      // to move and steer the aim. No normal shots can fire alongside it.
      if (time >= this.nextShotAt) {
        this.fireShotgunVolley(direction);
        this.combatArt?.begin(time, SHOTGUN_TRANSFORM.cadenceMs, 'shotgun');
        this.nextShotAt = time + SHOTGUN_TRANSFORM.cadenceMs;
      }
      return;
    }
    if (this.weaponId === 'fireorbs') {
      // This is a true held melee flame, not a rapid sequence of fake projectiles.
      if (firing) this.updateFlamethrower(time, direction);
      else this.hideFlamethrower();
      return;
    }
    if (!firing || time < this.nextShotAt) return;
    const config = this.config;
    const interval = fireIntervalMs(config.fireRate * this.owner.attackSpeedAt(time) * this.permanentSpeed);
    this.combatArt?.begin(time, interval);
    if (this.weaponId === 'iceblade') this.launchBigWave(direction);
    else if (this.weaponId === 'warhammer') {
      // The hitbox lands when the visible hammer-head actually reaches the floor.
      const aim = normalizedDirection(direction);
      const timer = this.scene.time.delayedCall(HAMMER_IMPACT_DELAY_MS, () => {
        this.hammerTimers.delete(timer);
        if (!this.owner.active || this.owner.currentHp <= 0 || !this.scene.sys.isActive()) return;
        this.groundSlam(aim, this.scene.time.now);
      });
      this.hammerTimers.add(timer);
    } else if (config.attackMode === 'melee') this.swing(direction);
    else if (this.weaponId === 'bow') {
      // The projectile leaves at the same frame as the visible fingers release
      // the fully drawn string. Direction is captured at the start of the fast draw.
      const aim = normalizedDirection(direction);
      const releaseDelay = poseLengthMs('bow', interval) *
        RANGER_WEAPON_ANIMATION.bowReleaseAt;
      const timer = this.scene.time.delayedCall(releaseDelay, () => {
        this.bowReleaseTimers.delete(timer);
        if (!this.owner.active || this.owner.currentHp <= 0 || !this.scene.sys.isActive()) return;
        this.fire(aim);
      });
      this.bowReleaseTimers.add(timer);
    } else this.fire(direction);
    this.nextShotAt = time + interval;
  }

  private fire(direction: Readonly<Vector2Value>): void {
    const config = this.config;
    const attack = this.createAttack();
    for (let index = 0; index < config.projectileCount + this.extraProjectiles; index += 1) {
      const count = config.projectileCount + this.extraProjectiles;
      const spread = count > 1 ? (index - (count - 1) / 2) * 0.16 : 0;
      const angle = Math.atan2(direction.y, direction.x) + spread;
      const vector = { x: Math.cos(angle), y: Math.sin(angle) };
      const distance = heroWeaponMuzzleDistance(this.weaponId);
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

  /** Actual seven directed, physical arrows per salvo; no instant laser
   * damage and no mutation of the original weapon or projectile upgrades. */
  private fireShotgunVolley(direction: Readonly<Vector2Value>): void {
    const heading = Math.atan2(direction.y, direction.x);
    const attack = this.createAttack();
    // Ability upgrades scale the new shots without replacing the equipped bow
    // or crossbow and without permanently changing their combat stats.
    attack.damage = this.shotgunDamage * this.owner.abilityDamageMultiplier +
      this.owner.damage * 0.35;
    const flash = this.scene.add.graphics().setDepth(26);
    this.groundEffects.add(flash);
    for (const angle of shotgunVolleyAngles(heading)) {
      const vector = {x:Math.cos(angle),y:Math.sin(angle)};
      const arrow = new Projectile(this.scene,
        this.owner.x + vector.x * 31, this.owner.y + vector.y * 31,
        vector, SHOTGUN_TRANSFORM.projectileSpeed, attack, 0,
        {textureKey:'arrow-placeholder',range:SHOTGUN_TRANSFORM.projectileRange,effect:'none'});
      addAndLaunch(arrow,()=>this.projectiles.add(arrow),vector,SHOTGUN_TRANSFORM.projectileSpeed);
      flash.lineStyle(3,0xbae6fd,0.86);
      flash.lineBetween(this.owner.x+vector.x*15,this.owner.y+vector.y*15,
        this.owner.x+vector.x*59,this.owner.y+vector.y*59);
    }
    this.scene.tweens.add({targets:flash,alpha:0,duration:150,
      onComplete:()=>{this.groundEffects.delete(flash);flash.destroy();}});
  }

  private swing(direction: Readonly<Vector2Value>): void {
    const config = this.config;
    const attack = this.createAttack();
    const range = config.meleeRange * (1 + this.extraMeleeRange);
    for (const child of this.meleeTargets?.getChildren() ?? []) {
      const target = child as Slime;
      if (!target.active || target.aiState === 'defeated' ||
        !isInsideMeleeSwing(this.owner, direction, target, range, config.meleeArc,
          // Dawnblade's wide whoosh can graze a mob even when its centre
          // lies just beyond the painted slash. Other weapons stay unchanged.
          this.weaponId === 'sunblade' ? 20 : 0)) continue;
      this.onMeleeHit?.(target, attack);
      if (this.meleeStunMs > 0 && target.active) {
        target.applyStun(this.scene.time.now, this.meleeStunMs);
      }
      if (config.specialEffects.includes('knockback') &&
        target.active && target.healthRatio > 0) {
        // Enemy AI respects the timed knockback, so the next chase frame
        // cannot immediately cancel the push.
        target.applyKnockback(this.scene.time.now, 240,
          direction.x, direction.y, 285);
      }
    }

    const angle = Math.atan2(direction.y, direction.x);
    if (this.weaponId === 'sunblade') {
      this.animateDawnbladeWhoosh(angle, config.meleeArc, range, config.color);
      return;
    }
    const arc = this.scene.add.arc(this.owner.x, this.owner.y, range,
      Phaser.Math.RadToDeg(angle - config.meleeArc / 2),
      Phaser.Math.RadToDeg(angle + config.meleeArc / 2), false, config.color, 0.2)
      .setStrokeStyle(5, config.color, 0.95).setDepth(24);
    this.scene.tweens.add({ targets: arc, alpha: 0, scale: 1.08, duration: 150,
      onComplete: () => arc.destroy() });
  }

  /** The wave crest travels forward from the Frostblade, covering a short wide strip.
   * Each enemy can be hit only once per cast; edge contacts receive splash damage. */
  private launchBigWave(direction: Readonly<Vector2Value>): void {
    const aim = normalizedDirection(direction);
    const origin = { x: this.owner.x, y: this.owner.y };
    const range = this.config.meleeRange * (1 + this.extraMeleeRange);
    const attack = this.createAttack();
    const hit = new Set<Slime>();
    const effect = this.scene.add.graphics().setDepth(26);
    this.groundEffects.add(effect);
    const applyHits = (distance: number): void => {
      for (const child of this.meleeTargets?.getChildren() ?? []) {
        if (!(child instanceof Slime) || !child.active || child.aiState === 'defeated' ||
          hit.has(child)) continue;
        const kind = bigWaveHitKind(origin, aim, child, distance, range);
        if (!kind) continue;
        hit.add(child);
        const splash = kind === 'splash';
        this.onMeleeHit?.(child, splash
          ? { ...attack, damage: attack.damage * BIG_WAVE.splashMultiplier } : attack);
        if (child.active && child.healthRatio > 0) {
          if (this.meleeStunMs > 0) child.applyStun(this.scene.time.now, this.meleeStunMs);
          child.applyKnockback(this.scene.time.now, BIG_WAVE.knockbackMs,
            aim.x, aim.y, BIG_WAVE.knockbackSpeed * (splash ? 0.8 : 1));
        }
      }
    };
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: BIG_WAVE.durationMs, ease: 'Sine.easeOut',
      onUpdate: tween => {
        if (!effect.active) return;
        const progress = tween.getValue() ?? 0;
        const reached = 22 + (range - 22) * progress;
        applyHits(reached);
        effect.clear();
        const right = { x: -aim.y, y: aim.x };
        // Three animated curves and foam droplets make the crest visibly
        // advance, rather than an invisible rectangular melee hitbox.
        for (let layer = 0; layer < 3; layer++) {
          const shifted = reached - layer * 12;
          const fade = Math.min(1, (1 - progress) * 2.6) * (1 - layer * 0.23);
          effect.lineStyle(layer === 0 ? 12 : 21,
            layer === 0 ? 0xd6ffff : layer === 1 ? 0x57caff : 0x2260b4,
            (layer === 0 ? 0.95 : 0.27) * fade);
          effect.beginPath();
          for (let index = 0; index <= 18; index++) {
            const t = (index / 18) * 2 - 1;
            const ripple = Math.sin(t * Math.PI * 2.1 + progress * 7 - layer) * 5;
            const bow = Math.cos(t * Math.PI / 2) * 11;
            const d = shifted + ripple + bow;
            const side = t * BIG_WAVE.halfWidth;
            const px = origin.x + aim.x * d + right.x * side;
            const py = origin.y + aim.y * d + right.y * side;
            if (index === 0) effect.moveTo(px, py);
            else effect.lineTo(px, py);
          }
          effect.strokePath();
        }
        effect.fillStyle(0xe7ffff, Math.max(0, 0.82 - progress * 0.62));
        for (let j = -3; j <= 3; j++) {
          const across = j * BIG_WAVE.halfWidth / 3;
          const d = reached + Math.sin(j * 1.9 + progress * 11) * 9;
          effect.fillCircle(
            origin.x + aim.x * d - aim.y * across,
            origin.y + aim.y * d + aim.x * across,
            2.5 + Math.abs(j % 3));
        }
      },
      onComplete: () => {
        if (effect.active) applyHits(range);
        this.groundEffects.delete(effect);
        if (effect.active) effect.destroy();
      },
    });
  }

  /** Damage remains continuous while held, independent of any shot cooldown.
   * A 200 ms contact step yields the configured damage PER SECOND, with an
   * additional independent burn tick every full second. */
  private updateFlamethrower(time: number, direction: Readonly<Vector2Value>): void {
    const aim = normalizedDirection(direction);
    const origin = { x: this.owner.x, y: this.owner.y };
    const range = this.config.meleeRange * (1 + this.extraMeleeRange);
    if (!this.flameEffect || !this.flameEffect.active) {
      this.flameEffect = this.scene.add.graphics().setDepth(25);
      this.groundEffects.add(this.flameEffect);
    }
    const flame = this.flameEffect;
    const side = { x: -aim.y, y: aim.x };
    const flicker = Math.sin(time / FLAMETHROWER.visualFlickerMs);
    flame.clear();
    // Layered hot-core / orange / red plume, tapering from the caster out.
    for (let layer = 0; layer < 3; layer++) {
      const width = FLAMETHROWER.coneEndHalfWidth * (1 - layer * 0.22);
      const length = range * (1 - layer * 0.1 + flicker * 0.025);
      const tx = origin.x + aim.x * length, ty = origin.y + aim.y * length;
      flame.fillStyle([0xff5124, 0xff9f29, 0xffec89][layer]!,
        [0.32, 0.46, 0.55][layer]!);
      flame.fillTriangle(
        origin.x + side.x * 13, origin.y + side.y * 13,
        tx + side.x * width, ty + side.y * width,
        tx - side.x * width, ty - side.y * width);
    }
    for (let i = 0; i < 7; i++) {
      const fraction = (i + 1) / 8;
      const wobble = Math.sin(time * 0.014 + i * 2.32) * fraction * 27;
      flame.fillStyle(i % 2 ? 0xffd34e : 0xff6b23, 0.45);
      flame.fillCircle(
        origin.x + aim.x * range * fraction + side.x * wobble,
        origin.y + aim.y * range * fraction + side.y * wobble,
        7 + fraction * 13);
    }

    if (time < this.nextFlameContactAt) return;
    this.nextFlameContactAt = time + FLAMETHROWER.damageTickMs;
    const fullAttack = this.createAttack();
    const contact = { ...fullAttack,
      damage: fullAttack.damage * FLAMETHROWER.damageTickMs / 1000 };
    for (const target of this.meleeTargets?.getChildren() ?? []) {
      if (!(target instanceof Slime) || !target.active || target.aiState === 'defeated' ||
        !flameConeHits(origin, aim, target, range)) continue;
      this.onMeleeHit?.(target, contact);
      if (!target.active || target.healthRatio <= 0) continue;
      if (this.meleeStunMs > 0) target.applyStun(time, this.meleeStunMs);
      const existing = this.burning.get(target);
      if (existing) {
        existing.expiresAt = time + FLAMETHROWER.burnDurationMs;
        existing.damage = fullAttack.damage * FLAMETHROWER.burnRatio;
      } else {
        this.burning.set(target, {
          expiresAt: time + FLAMETHROWER.burnDurationMs,
          nextTickAt: time + FLAMETHROWER.burnTickMs,
          damage: fullAttack.damage * FLAMETHROWER.burnRatio,
        });
      }
    }
  }

  private tickBurning(time: number): void {
    for (const [target, burn] of this.burning) {
      if (!target.active || target.aiState === 'defeated' || time > burn.expiresAt) {
        this.burning.delete(target);
        continue;
      }
      if (time < burn.nextTickAt) continue;
      burn.nextTickAt = time + FLAMETHROWER.burnTickMs;
      this.onMeleeHit?.(target, {
        damage: burn.damage, criticalChance: 0, criticalMultiplier: 1,
      });
      if (!target.active || target.healthRatio <= 0) this.burning.delete(target);
    }
  }

  private hideFlamethrower(): void {
    this.flameEffect?.clear();
    this.nextFlameContactAt = 0;
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

  /** Big, slow rectangular impact that shares Wind Burst's aiming geometry,
   * but slows instead of pushing. Each enemy is only hit once per hammer slam.
   */
  private groundSlam(direction: Readonly<Vector2Value>, time: number): void {
    const config = this.config;
    const aim = normalizedDirection(direction);
    const x = this.owner.x, y = this.owner.y;
    const { halfWidth, slowDurationMs, slowFactor } = WARHAMMER_GROUND_SLAM;
    const attack = this.createAttack();
    const range = config.meleeRange * (1 + this.extraMeleeRange);

    for (const child of this.meleeTargets?.getChildren() ?? []) {
      if (!(child instanceof Slime) || !child.active || child.aiState === 'defeated') continue;
      if (!inForwardRectangle(x, y, aim, child.x, child.y, range, halfWidth)) continue;
      this.onMeleeHit?.(child, attack);
      if (this.meleeStunMs > 0 && child.active) child.applyStun(time, this.meleeStunMs);
      if (child.active && child.healthRatio > 0) {
        child.applySlow(time, slowDurationMs, slowFactor);
      }
    }
    this.animateGroundCracks(x, y, aim, range, halfWidth, config.color);
  }

  /** Impact cracks propagate down the full collision rectangle, then fade.
   * No texture assets required; the fissures follow the hammer's aim direction.
   */
  private animateGroundCracks(
    x: number, y: number, direction: Readonly<Vector2Value>,
    length: number, halfWidth: number, color: number,
  ): void {
    const effect = this.scene.add.graphics().setDepth(9);
    this.groundEffects.add(effect);
    const nx = -direction.y, ny = direction.x;
    const point = (forward: number, side: number): { x: number; y: number } => ({
      x: x + direction.x * forward + nx * side,
      y: y + direction.y * forward + ny * side,
    });
    const corners = [
      point(0, -halfWidth), point(length, -halfWidth),
      point(length, halfWidth), point(0, halfWidth),
    ].map(p => new Phaser.Math.Vector2(p.x, p.y));
    // All fractures are inside the damaging rectangle. Fractions scale
    // with its weapon stats, so the animation and hitbox cannot drift apart.
    const fractures: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
      [[0.10, 0], [0.24, -0.12], [0.40, -0.09], [0.59, -0.38], [0.78, -0.31], [0.98, -0.54]],
      [[0.10, 0], [0.23, 0.18], [0.39, 0.13], [0.56, 0.52], [0.79, 0.75], [0.98, 0.84]],
      [[0.10, 0], [0.29, 0.02], [0.48, 0.17], [0.65, 0], [0.86, 0.15], [1, 0.04]],
      [[0.24, -0.12], [0.34, -0.50], [0.48, -0.77]],
      [[0.39, 0.13], [0.45, 0.60], [0.53, 0.84]],
      [[0.59, -0.38], [0.72, -0.80]],
      [[0.56, 0.52], [0.70, 0.30], [0.84, 0.42]],
    ];
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: WARHAMMER_GROUND_SLAM.crackAnimationMs,
      ease: 'Cubic.easeOut',
      onUpdate: tween => {
        if (!effect.active) return;
        const progress = tween.getValue() ?? 0;
        const reveal = Math.min(1, progress * 2.65);
        const fade = Math.min(1, (1 - progress) * 1.65);
        effect.clear();
        // Short ground-shock flash marks exactly the affected rectangle.
        if (progress < 0.30) {
          effect.fillStyle(color, 0.20 * (1 - progress / 0.30));
          effect.fillPoints(corners, true);
          effect.lineStyle(2, color, 0.66 * (1 - progress / 0.30));
          effect.strokePoints(corners, true);
        }
        for (const fracture of fractures) {
          for (let i = 0; i < fracture.length - 1; i += 1) {
            const from = fracture[i]!;
            const to = fracture[i + 1]!;
            if (from[0] > reveal) break;
            const portion = Math.min(1, (reveal - from[0]) / (to[0] - from[0]));
            const a = point(from[0] * length, from[1] * halfWidth);
            const b = point(
              (from[0] + (to[0] - from[0]) * portion) * length,
              (from[1] + (to[1] - from[1]) * portion) * halfWidth,
            );
            effect.lineStyle(5, 0x20150f, 0.95 * fade);
            effect.lineBetween(a.x, a.y, b.x, b.y);
            effect.lineStyle(1.7, 0xffdf86, 0.80 * fade);
            effect.lineBetween(a.x + nx * 2, a.y + ny * 2, b.x + nx * 2, b.y + ny * 2);
          }
        }
        // Dust particles appear as the crack advances and settle rapidly.
        effect.fillStyle(0xd6b88b, 0.75 * fade);
        for (let i = 0; i < 12; i += 1) {
          const forward = (0.13 + i * 0.073) * length;
          if (forward > length * reveal) continue;
          const side = Math.sin(i * 2.37) * halfWidth * 0.82;
          const p = point(forward, side);
          effect.fillCircle(p.x + nx * progress * 5, p.y + ny * progress * 5, 1.5 + i % 3);
        }
      },
      onComplete: () => {
        this.groundEffects.delete(effect);
        effect.destroy();
      },
    });
  }

  /** Room transitions must not leave old ground effects visible in the next arena. */
  public clearGroundEffects(): void {
    for (const timer of this.hammerTimers) timer.remove(false);
    this.hammerTimers.clear();
    for (const timer of this.bowReleaseTimers) timer.remove(false);
    this.bowReleaseTimers.clear();
    this.combatArt?.reset();
    for (const effect of this.groundEffects) {
      this.scene.tweens.killTweensOf(effect);
      effect.destroy();
    }
    this.groundEffects.clear();
    this.shotgunUntil = 0;
    this.shotgunDamage = 0;
    this.flameEffect = undefined;
    this.nextFlameContactAt = 0;
    this.burning.clear();
  }

  private createAttack(): AttackData {
    const config = this.config;
    const magicBonus = this.owner.heroId === 'mage' &&
      (config.effect === 'magic' || config.effect === 'chain-lightning') ? 1.2 : 1;
    return {
      damage: scaleRunWeaponDamage(config.damage * this.armorDamageMultiplier + this.permanentDamage,
        this.owner.damage, this.owner.runDamageStacks) * magicBonus,
      criticalChance: this.owner.criticalChance + config.criticalChanceModifier,
      criticalMultiplier: Math.max(this.owner.criticalMultiplier, config.criticalMultiplier),
    };
  }
}

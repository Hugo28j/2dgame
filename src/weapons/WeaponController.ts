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
import { GLACIAL_COMBO, glacialStrikeDelayMs, glacialStrikeHits,
  glacialStrikeShape, nextGlacialStrike, type GlacialStrike } from './glacialCombo';
import { SHOTGUN_TRANSFORM, shotgunVolleyAngles } from '../abilities/phase9Balance';

export class WeaponController {
  private nextShotAt = 0;
  private shotgunUntil = 0;
  private shotgunDamage = 0;
  private glacialStrike: GlacialStrike = 0;
  private lastGlacialStrikeAt = -Infinity;
  private readonly groundEffects = new Set<Phaser.GameObjects.Graphics>();
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
  ) {}
  public get attackMode(): 'melee' | 'projectile' { return this.config.attackMode; }
  public get config() { return getWeaponStats(this.weaponId, this.upgradeLevel); }
  /** Transient override: never alters weaponId, weapon level, save data or inventory. */
  public activateShotgunBuff(now: number, damage: number, durationMs = SHOTGUN_TRANSFORM.durationMs): boolean {
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
        this.nextShotAt = time + SHOTGUN_TRANSFORM.cadenceMs;
      }
      return;
    }
    if (!firing) {
      // Releasing the trigger for a while resets the *next* sequence, but does
      // not bypass the third strike's mandatory recovery.
      if (this.weaponId === 'iceblade' && time - this.lastGlacialStrikeAt > 650)
        this.glacialStrike = 0;
      return;
    }
    if (time < this.nextShotAt) return;
    const config = this.config;
    if (this.weaponId === 'iceblade') {
      const strike = this.glacialStrike;
      this.animateGlacialStrike(strike, direction);
      this.glacialStrike = nextGlacialStrike(strike);
      this.lastGlacialStrikeAt = time;
      this.nextShotAt = time + glacialStrikeDelayMs(strike,
        config.fireRate * this.owner.attackSpeedAt(time) * this.permanentSpeed);
      return; // Never also execute generic melee/swing for Glacial Blade.
    }
    if (this.weaponId === 'warhammer') this.groundSlam(direction, time);
    else if (config.attackMode === 'melee') this.swing(direction);
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

  /** Short slash, reverse slash, then a long fencing thrust. Each strike
   * resolves once at the visual contact frame with its own hitbox geometry. */
  private animateGlacialStrike(strike: GlacialStrike,
    direction: Readonly<Vector2Value>): void {
    const aim = normalizedDirection(direction);
    const config = this.config;
    const shape = glacialStrikeShape(strike,config.meleeRange*(1+this.extraMeleeRange));
    const angle = Math.atan2(aim.y,aim.x);
    const effect = this.scene.add.graphics().setDepth(27);
    this.groundEffects.add(effect);
    let applied=false;
    const duration = strike === 2 ? GLACIAL_COMBO.thrustAnimationMs :
      GLACIAL_COMBO.slashAnimationMs;
    this.scene.tweens.addCounter({
      from:0,to:1,duration,ease: 'Cubic.easeOut',
      onUpdate: tween => {
        if (!effect.active || !this.owner.active) return;
        const progress=tween.getValue()??0;
        if (!applied && progress >= (strike===2 ? 0.56 : 0.42)) {
          applied=true;
          this.hitGlacialStrike(strike,aim);
        }
        const ox=this.owner.x,oy=this.owner.y;
        const fade=Math.min(1, (1-progress)*2.5);
        effect.clear();
        if (strike !== 2) {
          // Two crescent slashes sweep in opposite directions.
          const forward=strike===0?progress:1-progress;
          const center=angle - shape.arc/2 + forward*shape.arc;
          const first= strike===0 ? Math.max(angle-shape.arc/2,center-.42) :
            Math.min(angle+shape.arc/2,center+.42);
          const a=Math.min(first,center), b=Math.max(first,center);
          effect.lineStyle(16,0x38bdf8,.27*fade);
          effect.beginPath();effect.arc(ox,oy,shape.reach-4,a,b);effect.strokePath();
          effect.lineStyle(7,0xb5f4ff,.94*fade);
          effect.beginPath();effect.arc(ox,oy,shape.reach-1,a,b);effect.strokePath();
          effect.lineStyle(2.5,0xffffff,.96*fade);
          effect.beginPath();effect.arc(ox,oy,shape.reach+3,a,b);effect.strokePath();
          effect.fillStyle(0xe0faff,fade);
          effect.fillCircle(ox+Math.cos(center)*shape.reach,
            oy+Math.sin(center)*shape.reach,3);
        } else {
          const reach=shape.reach*(.14+.86*progress);
          const sx=ox+aim.x*18, sy=oy+aim.y*18;
          const tx=ox+aim.x*reach,ty=oy+aim.y*reach;
          // Only a thin straight thrust is painted; width matches hitbox.
          effect.lineStyle(shape.halfWidth*2,0x38bdf8,.16*fade);
          effect.lineBetween(sx,sy,tx,ty);
          effect.lineStyle(9,0x7dd3fc,.68*fade);
          effect.lineBetween(sx,sy,tx,ty);
          effect.lineStyle(3,0xf0faff,fade);
          effect.lineBetween(sx,sy,tx,ty);
          const nx=-aim.y,ny=aim.x;
          effect.fillStyle(0xe0ffff,.9*fade);
          effect.fillTriangle(tx+aim.x*11,ty+aim.y*11,
            tx+nx*7,ty+ny*7,tx-nx*7,ty-ny*7);
        }
      },
      onComplete:()=>{
        // Don't lose hits when a lag spike advances past the contact frame.
        if (!applied && this.owner.active) this.hitGlacialStrike(strike,aim);
        this.groundEffects.delete(effect);
        if(effect.active) effect.destroy();
        if(strike===2 && this.owner.active) this.animateGlacialRecovery();
      },
    });
  }

  private hitGlacialStrike(strike: GlacialStrike,
    aim: Readonly<Vector2Value>): void {
    const attack=this.createAttack();
    const range=this.config.meleeRange;
    for(const child of this.meleeTargets?.getChildren()??[]){
      if (!(child instanceof Slime)||!child.active||child.aiState==='defeated')continue;
      if(!glacialStrikeHits(strike,this.owner,aim,child,range,this.extraMeleeRange))continue;
      this.onMeleeHit?.(child,attack);
      if(this.meleeStunMs>0&&child.active)
        child.applyStun(this.scene.time.now,this.meleeStunMs);
    }
  }

  /** Visible settling frost after the forward stab, within the long cooldown. */
  private animateGlacialRecovery(): void {
    const effect=this.scene.add.graphics().setDepth(26);
    this.groundEffects.add(effect);
    this.scene.tweens.addCounter({
      from:0,to:1,duration:GLACIAL_COMBO.recoveryAnimationMs,
      onUpdate:tween=>{
        if(!effect.active||!this.owner.active)return;
        const t=tween.getValue()??0;
        effect.clear();
        effect.lineStyle(2.5,0xb6ecff,.65*(1-t));
        effect.strokeCircle(this.owner.x,this.owner.y,20+t*8);
        effect.fillStyle(0xffffff,.45*(1-t));
        for(let i=0;i<5;i++){
          const a=i*2*Math.PI/5;
          effect.fillCircle(this.owner.x+Math.cos(a)*(21+t*17),
            this.owner.y+Math.sin(a)*(21+t*17),2.4);
        }
      },
      onComplete:()=>{this.groundEffects.delete(effect);if(effect.active)effect.destroy()},
    });
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
    for (const effect of this.groundEffects) {
      this.scene.tweens.killTweensOf(effect);
      effect.destroy();
    }
    this.groundEffects.clear();
    this.shotgunUntil = 0;
    this.shotgunDamage = 0;
    this.glacialStrike = 0;
    this.lastGlacialStrikeAt = -Infinity;
  }

  private createAttack(): AttackData {
    const config = this.config;
    const magicBonus = this.owner.heroId === 'mage' &&
      (config.effect === 'magic' || config.effect === 'chain-lightning') ? 1.2 : 1;
    return {
      damage: (config.damage * this.armorDamageMultiplier + this.permanentDamage + this.owner.damage) * magicBonus,
      criticalChance: this.owner.criticalChance + config.criticalChanceModifier,
      criticalMultiplier: Math.max(this.owner.criticalMultiplier, config.criticalMultiplier),
    };
  }
}

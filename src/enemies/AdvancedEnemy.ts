import type { WorldId } from '../worlds/worldConfig';
import { getWorldCharacter } from './worldCharacters';
import Phaser from 'phaser';
import { getEnemyStatsForRoom, type EnemyKind, type SlimeRuntimeStats } from './enemyConfig';
import { bossPhase, rangedVelocity } from './enemyMovement';
import { Slime } from './Slime';
import { getChaseVelocity, getObstacleAvoidanceVelocity } from './slimeMovement';
import { coverIsClose, rangedCoverSpot, shieldEndpoints, shouldBreakTreantShield, type ShieldSurface } from './treantShield';
import { getBossPlan, getBossProfile } from './bossProfiles';
import { CHARGER_DASH, WORLD1_BEETLE_DASH } from './enemyBalance';
import { MOSS_DASH, ROOT_BRANCH, SPORE_THROW_INTERVAL_MS } from './worldOneBossBalance';
import { FROZEN_EARLY } from './frozenEarlyGame';
import { FROZEN_BALANCE } from './frozenBalance';
import { BRAMBLE_CINEMATIC } from './brambleCinematic';
import { sporePatrolVelocity } from './sporeMovement';
import type { BulletPattern } from './projectilePatterns';
export type { BulletPattern } from './projectilePatterns';

export type EnemyFire = (enemy: AdvancedEnemy, pattern: BulletPattern, volley?: number, speed?: number) => void;
export type EnemyExplosion = (enemy: AdvancedEnemy, radius: number) => void;
export type EnemySummon = (enemy: AdvancedEnemy) => void;
export type EnemyRoot = (enemy: AdvancedEnemy, attack: 'line' | 'burst', targetX: number, targetY: number, rotation: number | boolean) => void;
export type EnemyTrail = (enemy: AdvancedEnemy, x: number, y: number) => void;
export type EnemyBomb = (enemy: AdvancedEnemy, targetX: number, targetY: number,
  count: number, radius: number, windupMs: number) => void;

/** Reuses the phase-3 shared HP, damage, slow and death events for all enemy types. */
export class AdvancedEnemy extends Slime {
  public readonly kind: Exclude<EnemyKind, 'slime'>;
  public readonly stats: Readonly<SlimeRuntimeStats>;
  private nextShotAt = 0;
  private nextTrailAt = 0;
  private nextSnowfallAt = 0;
  private rootStage: 'ready' | 'second' | 'third' | 'rest' = 'ready';
  public fasterTwin = false;
  /** Index of the two split Void Sentinels (0 spins clockwise, 1 counterclockwise). */
  public splitTwinIndex: 0 | 1 = 0;
  private bossVolleys = 0;
  private readonly roomNumber: number;
  private readonly worldId: WorldId;
  private nextSpecialAt = 0;
  private nextSummonAt = 0;
  private witchHat?: Phaser.GameObjects.Graphics;
  private windupEndsAt = 0;
  private dashEndsAt = 0;
  private dashX = 0;
  private dashY = 0;
  private warning?: Phaser.GameObjects.Graphics;
  private readonly orbitSign: -1 | 1;
  private readonly bossTint: number;
  private shieldGraphic?: Phaser.GameObjects.Graphics;
  private treantShieldBroken = false;
  private shieldFacingX = 0;
  private shieldFacingY = 1;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number,
    kind: Exclude<EnemyKind, 'slime'>, roomNumber: number,
    worldId: WorldId = 1,
    public readonly bossSlot = 0) {
    const stats = getEnemyStatsForRoom(kind, roomNumber, worldId, bossSlot);
    super(scene, id, x, y, stats);
    this.kind = kind;
    this.roomNumber = roomNumber;
    this.worldId = worldId;
    this.stats = stats;
    // Sprite palette is baked into the world-specific texture; white tint preserves detail.
    this.bossTint = 0xffffff;
    this.orbitSign = id.length % 2 === 0 ? 1 : -1;
    this.setTexture(getWorldCharacter(worldId, kind, roomNumber, bossSlot).textureKey);
    if (kind === 'boss') {
      this.setScale(1.75);
      this.setTint(this.bossTint);
      const body = this.body;
      if (body instanceof Phaser.Physics.Arcade.Body) body.setCircle(21, 3, 3);
    }
    if (worldId === 1 && kind === 'tank') {
      this.shieldGraphic = scene.add.graphics().setDepth(13);
    }
    this.nextShotAt = scene.time.now + stats.attackIntervalMs;
    this.nextSpecialAt = scene.time.now + 1500;
    this.nextSummonAt = scene.time.now + (worldId === 2 && roomNumber === 15 && kind === 'boss'
      ? FROZEN_BALANCE.sentinelSummonIntervalMs : FROZEN_EARLY.witchSummonIntervalMs);
    if (this.isFrostWitch) this.witchHat = scene.add.graphics().setDepth(14);
  }

  public get isBoss(): boolean { return this.kind === 'boss'; }
  public get isBrambleGunner(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 20 &&
      this.bossSlot === 0 && !this.fasterTwin;
  }
  protected override keepBodyOnDefeat(): boolean { return this.isBrambleGunner; }
  /** Scripted warnings and dashes should not be slowed by ordinary ice steering. */
  public get hasScriptedMotion(): boolean {
    return this.windupEndsAt > 0 || this.dashEndsAt > 0;
  }
  public get isGlacierWarden(): boolean {
    return this.isBoss && this.worldId === 2 && this.roomNumber === 5;
  }
  public get isSnowSentinel(): boolean {
    return this.isBoss && this.worldId === 2 && this.roomNumber === 15 && this.bossSlot === 1;
  }
  public get isFrostWitch(): boolean {
    return this.worldId === 2 && this.kind === 'mage';
  }
  public get isAncientTreant(): boolean { return this.kind === 'tank' && this.worldId === 1; }
  public get isTreantShield(): boolean {
    return this.isAncientTreant && !this.treantShieldBroken;
  }
  public get shieldSurface(): ShieldSurface {
    return { x: this.x, y: this.y, facingX: this.shieldFacingX, facingY: this.shieldFacingY };
  }
  public get isPoisonAlchemist(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 15;
  }
  public get isRootTyrant(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 10;
  }
  public get isMossWarden(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 5;
  }

  public updateAI(targetX: number, targetY: number, now: number,
    fire: EnemyFire, explode: EnemyExplosion, dropBombs?: EnemyBomb,
    coverTank?: Readonly<ShieldSurface>, summon?: EnemySummon,
    rootAttack?: EnemyRoot, trailBomb?: EnemyTrail,
    frozenSpecial?: (enemy: AdvancedEnemy, effect: 'boulder' | 'snow' | 'golems', count: number) => void): void {
    if (this.aiState === 'defeated') return;
    super.chase(targetX, targetY);
    if (this.isStunned(now)) return;
    if (this.isFrostWitch) this.drawWitchHat(now);
    if (this.isTreantShield) {
      const dx = targetX - this.x, dy = targetY - this.y;
      const length = Math.hypot(dx, dy);
      if (length > 0.001) {
        this.shieldFacingX = dx / length;
        this.shieldFacingY = dy / length;
      }
      this.drawTreantShield();
    }
    if (this.isKnockedBack(now)) return;
    if (this.worldId === 2 && this.kind !== 'boss' && this.kind !== 'mage' && this.kind !== 'archer') {
      this.updateLateFrozenMob(targetX, targetY, now, fire, dropBombs);
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const speed = this.stats.movementSpeed * this.slowMultiplier;

    switch (this.kind) {
      case 'archer':
      case 'mage': {
        const move = coverTank && coverIsClose(this, coverTank)
          ? (() => {
              const behind = rangedCoverSpot(coverTank, this.orbitSign);
              const distanceToCover = Math.hypot(behind.x - this.x, behind.y - this.y);
              return distanceToCover < 19 ? { x: 0, y: 0 } :
                getChaseVelocity(this.x, this.y, behind.x, behind.y, speed);
            })()
          : rangedVelocity(this.x, this.y, targetX, targetY, speed,
              this.kind === 'archer' ? 210 : 155, this.orbitSign);
        const body = this.body;
        const horizontalBlock = body instanceof Phaser.Physics.Arcade.Body &&
          (body.blocked.left || body.blocked.right || body.touching.left || body.touching.right);
        const verticalBlock = body instanceof Phaser.Physics.Arcade.Body &&
          (body.blocked.up || body.blocked.down || body.touching.up || body.touching.down);
        const velocity = horizontalBlock || verticalBlock
          ? getObstacleAvoidanceVelocity(horizontalBlock, targetX - this.x,
              targetY - this.y, speed, this.orbitSign)
          : move;
        this.setVelocity(velocity.x, velocity.y);
        if (now >= this.nextShotAt) {
          fire(this, this.isFrostWitch || this.kind === 'archer' ? 'single' : 'double');
          this.nextShotAt = now + this.stats.attackIntervalMs;
        }
        if (this.isFrostWitch && now >= this.nextSummonAt) {
          summon?.(this);
          this.nextSummonAt = now + FROZEN_EARLY.witchSummonIntervalMs;
        }
        break;
      }
      case 'tank':
        // Slow, hard-hitting chaser: super.chase already includes obstacle avoidance.
        break;
      case 'charger':
        this.chargeLogic(targetX, targetY, now, distance, CHARGER_DASH.rechargeMs);
        break;
      case 'bomber':
        if (this.windupEndsAt > 0) {
          this.setVelocity(0, 0);
          this.drawWarning(95, 0xfb923c);
          if (now >= this.windupEndsAt) {
            this.clearWarning();
            explode(this, 95);
            this.playDefeat();
          }
        } else if (distance < 113 && now >= this.nextSpecialAt) {
          this.windupEndsAt = now + 760;
          this.setVelocity(0, 0);
          this.drawWarning(95, 0xfb923c);
        }
        break;
      case 'boss': {
        const phase = bossPhase(this.healthRatio);
        const profile = getBossProfile(this.roomNumber, this.bossSlot, this.worldId);
        const mode = getBossPlan(this.roomNumber, phase, this.bossVolleys, this.bossSlot, this.worldId);
        const move = rangedVelocity(this.x, this.y, targetX, targetY, speed,
          profile.preferredRange, this.orbitSign);
        if (this.isGlacierWarden) {
          this.setVelocity(move.x * 0.65, move.y * 0.65);
          if (now >= this.nextShotAt) {
            frozenSpecial?.(this, 'boulder', 1);
            this.nextShotAt = now + (phase === 1 ? 2950 : 2250);
          }
          if (phase === 2 && now >= this.nextSnowfallAt) {
            frozenSpecial?.(this, 'snow', 1);
            this.nextSnowfallAt = now + 1000 / FROZEN_BALANCE.snowballsPerSecond;
          }
          break;
        }
        if (this.isSnowSentinel && now >= this.nextSummonAt) {
          frozenSpecial?.(this, 'golems', phase === 1 ?
            FROZEN_BALANCE.sentinelPhaseOneCount : FROZEN_BALANCE.sentinelPhaseTwoCount);
          this.nextSummonAt = now + FROZEN_BALANCE.sentinelSummonIntervalMs;
        }
        if (this.isRootTyrant) {
          this.setVelocity(move.x * 0.55, move.y * 0.55);
          if (now >= this.nextShotAt) {
            if (phase === 1) {
              rootAttack?.(this, 'line', targetX, targetY, false);
              this.nextShotAt = now + ROOT_BRANCH.lineRecoveryMs + ROOT_BRANCH.lineWarningMs;
            } else if (this.rootStage === 'ready') {
              rootAttack?.(this, 'burst', targetX, targetY, 0);
              this.rootStage = 'second';
              this.nextShotAt = now + ROOT_BRANCH.burstStaggerMs;
            } else if (this.rootStage === 'second') {
              rootAttack?.(this, 'burst', targetX, targetY, 1);
              this.rootStage = 'third';
              this.nextShotAt = now + ROOT_BRANCH.burstStaggerMs;
            } else if (this.rootStage === 'third') {
              rootAttack?.(this, 'burst', targetX, targetY, 2);
              this.rootStage = 'rest';
              this.nextShotAt = now + ROOT_BRANCH.pauseAfterBurstMs;
            } else {
              this.rootStage = 'ready';
              this.nextShotAt = now;
            }
          }
          break;
        }
        if (this.isMossWarden) {
          // Moss Warden only dashes; phase two also leaves explosive bomb trails.
          this.chargeLogic(targetX, targetY, now, distance,
            phase === 1 ? MOSS_DASH.phaseOneRechargeMs : MOSS_DASH.phaseTwoRechargeMs);
          if (phase === 2 && this.dashEndsAt > now && now >= this.nextTrailAt) {
            trailBomb?.(this, this.x, this.y);
            this.nextTrailAt = now + MOSS_DASH.trailSpacingMs;
          }
          break;
        }
        if (this.worldId === 1 && this.roomNumber === 20 && this.fasterTwin) {
          const sibling = this.scene.children.list.find(child =>
            child instanceof AdvancedEnemy && child !== this && child.active &&
            child.kind === 'boss' && child.fasterTwin && child.bossSlot === this.bossSlot);
          if (sibling instanceof AdvancedEnemy) {
            const dx = this.x - sibling.x, dy = this.y - sibling.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1 && dist < 210) {
              move.x += dx / dist * speed * 0.9;
              move.y += dy / dist * speed * 0.9;
            }
          }
        }
        if (this.windupEndsAt === 0 && this.dashEndsAt === 0) {
          const body = this.body;
          const blockedX = body instanceof Phaser.Physics.Arcade.Body &&
            (body.blocked.left || body.blocked.right || body.touching.left || body.touching.right);
          const blockedY = body instanceof Phaser.Physics.Arcade.Body &&
            (body.blocked.up || body.blocked.down || body.touching.up || body.touching.down);
          // Spore Alchemist actively patrols the arena instead of holding the
          // same preferred distance. All other bosses retain their existing AI.
          const desired = this.isPoisonAlchemist ?
            sporePatrolVelocity(this, {x: targetX, y: targetY},
              this.scene.physics.world.bounds, now, speed * 1.7, this.orbitSign) : move;
          const velocity = blockedX || blockedY
            ? getObstacleAvoidanceVelocity(blockedX, targetX - this.x,
                targetY - this.y, this.isPoisonAlchemist ? speed * 1.7 : speed, this.orbitSign)
            : desired;
          this.setVelocity(velocity.x, velocity.y);
        }
        if (now >= this.nextShotAt && this.windupEndsAt === 0 && this.dashEndsAt === 0) {
          if (!this.isPoisonAlchemist) fire(this, mode.pattern, this.bossVolleys, mode.speed);
          if (mode.bombs > 0 && dropBombs && !(this.worldId === 2 && this.roomNumber === 10)) {
            dropBombs(this, targetX, targetY,
              this.isPoisonAlchemist ? (phase === 1 ? 6 : 12) : mode.bombs,
              mode.radius, mode.windupMs);
          }
          this.bossVolleys++;
          const scaledInterval = this.stats.attackIntervalMs * mode.tempo;
          this.nextShotAt = now + (this.isPoisonAlchemist ? SPORE_THROW_INTERVAL_MS :
            Math.max(100, scaledInterval / (this.fasterTwin ? BRAMBLE_CINEMATIC.sentinelAttackRateMultiplier :
              this.worldId === 1 && this.roomNumber === 25 ? 1.5 : 1)));
        }
        // Only explicitly charging bosses use dash logic; other nine archetypes
        // are NOT automatically assigned the old common charge attack.
        if ((mode.dashEvery > 0 && this.bossVolleys > 0 &&
            this.bossVolleys % mode.dashEvery === 0) ||
          this.windupEndsAt > 0 || this.dashEndsAt > 0) {
          this.chargeLogic(targetX, targetY, now, distance,
            this.isMossWarden ? (phase === 2 ? 2050 : 2750) :
              phase === 2 ? 2900 : 4400);
        }
        break;
      }
    }
  }

  private drawWitchHat(now: number): void {
    const g = this.witchHat;
    if (!g || !g.active) return;
    g.clear();
    // Distinct ice witch silhouette over the existing Aurora Spirit texture.
    const x = this.x, y = this.y - 18;
    g.fillStyle(0x283d78, 0.98);
    g.fillTriangle(x - 17, y + 4, x + 13, y + 4, x + 2, y - 27);
    g.fillStyle(0x93c5fd, 0.95);
    g.fillRect(x - 18, y + 3, 38, 5);
    g.lineStyle(2, 0xcffafe, 0.94);
    g.lineBetween(x - 13, y - 2, x + 14, y - 2);
    g.fillStyle(0x67e8f9, 0.7 + 0.2 * Math.sin(now / 240));
    g.fillCircle(x + 16, y - 18, 4);
  }

  private updateLateFrozenMob(targetX: number, targetY: number, now: number,
    fire: EnemyFire, dropBombs?: EnemyBomb): void {
    if (this.kind === 'tank') return; // Giant chaser that splits on defeat.
    if (this.kind !== 'bomber' && this.kind !== 'charger') return;
    const speed = this.stats.movementSpeed * this.slowMultiplier;
    const movement = rangedVelocity(this.x, this.y, targetX, targetY, speed,
      this.kind === 'bomber' ? 310 : 175, this.orbitSign);
    this.setVelocity(movement.x, movement.y);
    if (now < this.nextShotAt) return;
    if (this.kind === 'bomber') dropBombs?.(this, targetX, targetY, 1, 62, 950);
    else fire(this, 'shotgun-six');
    this.nextShotAt = now + (this.kind === 'charger' ? 4400 : this.stats.attackIntervalMs);
  }

  /** The drawn plate is the same actual line segment used in damage interception.
   * The green bar above the enemy already represents its entire shield + body HP.
   */
  /** Damage from any source (arrows, explosions or abilities) can shatter the
   * shield. The flag changes immediately, so projectiles no longer intercept. */
  public override receiveDamage(amount: number): boolean {
    const defeated = super.receiveDamage(amount);
    if (this.isTreantShield && shouldBreakTreantShield(this.healthRatio, this.treantShieldBroken))
      this.breakTreantShield();
    return defeated;
  }

  private breakTreantShield(): void {
    if (!this.isTreantShield) return;
    this.treantShieldBroken = true;
    const [a, b] = shieldEndpoints(this.shieldSurface);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    this.shieldGraphic?.clear();
    this.shieldGraphic?.destroy();
    this.shieldGraphic = undefined;
    // Splinter burst follows the real shield's angle; temporary objects are
    // cleaned automatically on room/scene shutdown.
    const cracks = this.scene.add.graphics().setDepth(28);
    cracks.lineStyle(3, 0xfef3c7, 1);
    cracks.lineBetween(a.x, a.y, x, y);
    cracks.lineBetween(x, y, b.x, b.y);
    cracks.lineStyle(2, 0x4b321e, 1);
    cracks.lineBetween(x - 11, y - 15, x + 2, y + 4);
    cracks.lineBetween(x + 2, y + 4, x + 14, y + 18);
    this.scene.tweens.add({
      targets: cracks, alpha: 0, duration: 360, ease: 'Cubic.easeIn',
      onComplete: () => cracks.destroy(),
    });
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (let i = 0; i < 8; i++) {
      const along = (i - 3.5) / 4;
      const originX = x + Math.cos(angle) * along * 33;
      const originY = y + Math.sin(angle) * along * 33;
      const direction = angle + ((i % 2) ? 1 : -1) * (0.5 + i * 0.17);
      const length = 18 + i % 4 * 8;
      const shard = this.scene.add.triangle(originX, originY, 0, -8, -5, 6, 5, 6,
        i % 2 === 0 ? 0xb88953 : 0xe3bf87).setDepth(29);
      this.scene.tweens.add({
        targets: shard,
        x: originX + Math.cos(direction) * length,
        y: originY + Math.sin(direction) * length,
        angle: (i % 2 ? 120 : -120),
        alpha: 0,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private drawTreantShield(): void {
    const graphic = this.shieldGraphic;
    if (!graphic || !graphic.active || !this.isTreantShield) return;
    const [a, b] = shieldEndpoints(this.shieldSurface);
    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;
    const nx = this.shieldFacingX, ny = this.shieldFacingY;
    graphic.clear();
    graphic.lineStyle(15, 0x243b24, 0.98);
    graphic.lineBetween(a.x, a.y, b.x, b.y);
    graphic.lineStyle(10, 0x826a3f, 1);
    graphic.lineBetween(a.x, a.y, b.x, b.y);
    graphic.lineStyle(6, 0xc6a86c, 0.98);
    graphic.lineBetween(a.x + nx * 2, a.y + ny * 2, b.x + nx * 2, b.y + ny * 2);
    graphic.lineStyle(2.8, 0xd9f99d, 0.85);
    graphic.lineBetween(a.x + nx * 7, a.y + ny * 7, b.x + nx * 7, b.y + ny * 7);
    // A central metal boss plate and two wooden cross-braces.
    graphic.fillStyle(0x647744, 1);
    graphic.fillCircle(centerX + nx * 6, centerY + ny * 6, 9);
    graphic.lineStyle(2, 0xfef3c7, 0.9);
    graphic.strokeCircle(centerX + nx * 6, centerY + ny * 6, 9);
    const integrity = this.healthRatio;
    if (integrity < 0.67) {
      const dx = b.x - a.x, dy = b.y - a.y;
      graphic.lineStyle(2.5, 0x20190d, 0.85);
      graphic.lineBetween(a.x + dx * 0.22, a.y + dy * 0.22,
        centerX - nx * 4, centerY - ny * 4);
      if (integrity < 0.33) graphic.lineBetween(centerX + nx * 3, centerY + ny * 3,
        b.x - dx * 0.14, b.y - dy * 0.14);
    }
  }

  public override showHit(): void {
    super.showHit();
    if (this.isBoss) {
      this.scene.time.delayedCall(85, () => {
        if (this.active && this.aiState !== 'defeated') {
          this.setTint(this.bossTint);
        }
      });
    }
  }

  private chargeLogic(targetX: number, targetY: number, now: number,
    distance: number, rechargeMs: number): void {
    if (this.dashEndsAt > 0) {
      if (now < this.dashEndsAt) {
        const chargeSpeed = this.isMossWarden ?
          (bossPhase(this.healthRatio) === 1 ? MOSS_DASH.phaseOneSpeed : MOSS_DASH.phaseTwoSpeed) :
          this.isBoss ? 360 : CHARGER_DASH.speed *
            (this.worldId === 1 && this.kind === 'charger' ? WORLD1_BEETLE_DASH.speedMultiplier : 1);
        this.setVelocity(this.dashX * chargeSpeed * this.slowMultiplier,
          this.dashY * chargeSpeed * this.slowMultiplier);
        return;
      }
      this.dashEndsAt = 0;
      this.setVelocity(0, 0);
      this.nextSpecialAt = now + rechargeMs;
      return;
    }
    if (this.windupEndsAt > 0) {
      this.setVelocity(0, 0);
      this.drawWarning(70, 0xef4444);
      if (now >= this.windupEndsAt) {
        this.clearWarning();
        this.dashEndsAt = now + (this.isMossWarden ?
          (bossPhase(this.healthRatio) === 1 ? MOSS_DASH.phaseOneDurationMs : MOSS_DASH.phaseTwoDurationMs) :
          this.kind === 'charger' ? CHARGER_DASH.durationMs *
            (this.worldId === 1 ? WORLD1_BEETLE_DASH.durationMultiplier : 1) : 360);
      }
      return;
    }
    if (now >= this.nextSpecialAt && distance < (this.isBoss ? 360 : 230)) {
      const direction = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y).normalize();
      this.dashX = direction.x;
      this.dashY = direction.y;
      this.windupEndsAt = now + (this.isMossWarden ? MOSS_DASH.warningMs : this.isBoss ? 770 :
        CHARGER_DASH.telegraphMs);
      this.setVelocity(0, 0);
      this.drawWarning(70, 0xef4444);
    }
  }

  private drawWarning(radius: number, color: number): void {
    if (!this.warning) this.warning = this.scene.add.graphics().setDepth(25);
    this.warning.clear();
    if (this.kind === 'bomber') {
      this.warning.lineStyle(3, color, 0.85);
      this.warning.strokeCircle(this.x, this.y, radius);
      this.warning.fillStyle(color, 0.16);
      this.warning.fillCircle(this.x, this.y, radius);
      return;
    }
    // Warn about the full dash corridor, not an unrelated circle.
    const reach = this.isMossWarden ?
      (bossPhase(this.healthRatio) === 1 ? MOSS_DASH.phaseOneSpeed * MOSS_DASH.phaseOneDurationMs :
        MOSS_DASH.phaseTwoSpeed * MOSS_DASH.phaseTwoDurationMs) / 1000 :
      this.kind === 'charger' ? CHARGER_DASH.distance *
        (this.worldId === 1 ? WORLD1_BEETLE_DASH.speedMultiplier *
          WORLD1_BEETLE_DASH.durationMultiplier : 1) : 360 * 0.36;
    const halfWidth = this.isBoss ? 32 : 24;
    const normalX = -this.dashY * halfWidth;
    const normalY = this.dashX * halfWidth;
    const points = [
      { x: this.x + normalX, y: this.y + normalY },
      { x: this.x + this.dashX * reach + normalX, y: this.y + this.dashY * reach + normalY },
      { x: this.x + this.dashX * reach - normalX, y: this.y + this.dashY * reach - normalY },
      { x: this.x - normalX, y: this.y - normalY },
    ];
    const corners = points.map(point => new Phaser.Math.Vector2(point.x, point.y));
    this.warning.fillStyle(color, 0.18);
    this.warning.fillPoints(corners, true);
    this.warning.lineStyle(3, color, 0.9);
    this.warning.strokePoints(corners, true);
  }
  private clearWarning(): void {
    this.windupEndsAt = 0;
    this.warning?.destroy();
    this.warning = undefined;
  }
  public override playDefeat(): void {
    this.witchHat?.clear();
    this.shieldGraphic?.clear();
    this.clearWarning();
    super.playDefeat();
  }
  public override destroy(fromScene?: boolean): void {
    this.witchHat?.destroy();
    this.witchHat = undefined;
    this.shieldGraphic?.destroy();
    this.shieldGraphic = undefined;
    this.warning?.destroy();
    this.warning = undefined;
    super.destroy(fromScene);
  }
}

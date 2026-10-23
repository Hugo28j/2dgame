import type { WorldId } from '../worlds/worldConfig';
import { getWorldCharacter } from './worldCharacters';
import Phaser from 'phaser';
import { getEnemyStatsForRoom, type EnemyKind, type SlimeRuntimeStats } from './enemyConfig';
import { bossPhase, rangedVelocity } from './enemyMovement';
import { Slime } from './Slime';
import { delayEnemyAttackForStun, initialEnemyShotDelay } from './enemyAttackTiming';
import { getChaseVelocity, getObstacleAvoidanceVelocity } from './slimeMovement';
import { coverIsClose, rangedCoverSpot, shieldEndpoints, shouldBreakTreantShield, type ShieldSurface } from './treantShield';
import { getBossPlan, getBossProfile } from './bossProfiles';
import { CHARGER_DASH, WORLD1_BEETLE_DASH } from './enemyBalance';
import { MOSS_DASH, ROOT_BRANCH, SPORE_THROW_INTERVAL_MS } from './worldOneBossBalance';
import { FROZEN_BALANCE } from './frozenBalance';
import { firstSummonTime, getSummonerType, nextSummonTime, summonIsDue,
  type SummonerType } from './summonCadence';
import { BRAMBLE_CINEMATIC } from './brambleCinematic';
import { JADE_BRANCH } from './groveAttacks';
import { sporePatrolVelocity } from './sporeMovement';
import { EMBER_ATTACKS } from './emberWastes';
import { EMBER_BOSS_ATTACKS, getEmberBossAttack,
  type EmberBossAttack } from './emberBosses';
import type { BulletPattern } from './projectilePatterns';
import { BRIAR_ARCHER_DRAW_MS, briarBowDrawAmount } from './briarArcher';
export type { BulletPattern } from './projectilePatterns';

export type EnemyFire = (enemy: AdvancedEnemy, pattern: BulletPattern, volley?: number, speed?: number) => void;
export type EnemyExplosion = (enemy: AdvancedEnemy, radius: number) => void;
export type EnemySummon = (enemy: AdvancedEnemy) => void;
export type EnemyRoot = (enemy: AdvancedEnemy, attack: 'line' | 'burst', targetX: number, targetY: number, rotation: number | boolean) => void;
export type EnemyTrail = (enemy: AdvancedEnemy, x: number, y: number) => void;
export type EnemyJadeBranches = (enemy: AdvancedEnemy) => void;
export type EnemyBomb = (enemy: AdvancedEnemy, targetX: number, targetY: number,
  count: number, radius: number, windupMs: number) => void;
export type EnemyEmberBoss = (enemy: AdvancedEnemy, attack: Exclude<EmberBossAttack, 'pentaflare'>,
  phase: 1 | 2, cycle: number) => void;

/** Reuses the phase-3 shared HP, damage, slow and death events for all enemy types. */
export class AdvancedEnemy extends Slime {
  public readonly kind: Exclude<EnemyKind, 'slime'>;
  public readonly stats: Readonly<SlimeRuntimeStats>;
  private nextShotAt = 0;
  private nextTrailAt = 0;
  private nextSnowfallAt = 0;
  private nextJadeBranchesAt = 0;
  private rootStage: 'ready' | 'second' | 'third' | 'rest' = 'ready';
  public fasterTwin = false;
  /** Index of the two split Void Sentinels (0 spins clockwise, 1 counterclockwise). */
  public splitTwinIndex: 0 | 1 = 0;
  private bossVolleys = 0;
  private readonly roomNumber: number;
  private readonly worldId: WorldId;
  private nextSpecialAt = 0;
  private nextSummonAt = Number.POSITIVE_INFINITY;
  private readonly summonerType: SummonerType | undefined;
  private witchHat?: Phaser.GameObjects.Graphics;
  private archerBow?: Phaser.GameObjects.Graphics;
  private archerAimAngle = 0;
  private archerDrawStartedAt = -100000;
  private archerReleaseAt = 0;
  private windupEndsAt = 0;
  private windupStartedAt = 0;
  private dashEndsAt = 0;
  private dashStartedAt = 0;
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
    if (worldId === 3 && kind !== 'boss') {
      const summonedScale = id.startsWith('lava-summon-') ? 1.22 : 1;
      this.setScale(summonedScale);
      scene.tweens.add({ targets: this, scaleX: 1.06 * summonedScale, scaleY: 0.94 * summonedScale,
        duration: 330 + (id.length % 4) * 45, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    }
    if (kind === 'boss') {
      this.setScale(1.75);
      this.setTint(this.bossTint);
      if (worldId === 3) {
        scene.tweens.add({ targets: this, scaleX: 1.86, scaleY: 1.64,
          duration: 460 + bossSlot * 80, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
      }
      const body = this.body;
      if (body instanceof Phaser.Physics.Arcade.Body) body.setCircle(21, 3, 3);
    }
    if (worldId === 1 && kind === 'tank') {
      this.shieldGraphic = scene.add.graphics().setDepth(13);
    }
    this.nextShotAt = scene.time.now + initialEnemyShotDelay(id, stats.attackIntervalMs);
    this.nextJadeBranchesAt = scene.time.now + JADE_BRANCH.intervalMs / 2;
    this.nextSpecialAt = scene.time.now + initialEnemyShotDelay(id + '-special', 1500);
    this.summonerType = getSummonerType(worldId, kind, roomNumber, bossSlot);
    this.nextSummonAt = firstSummonTime(scene.time.now, this.summonerType);
    if (this.isFrostWitch) this.witchHat = scene.add.graphics().setDepth(14);
    if (this.isBriarArcher) this.archerBow = scene.add.graphics().setDepth(14);
  }

  /** Only THIS enemy's attack and summon clocks pause while it is stunned.
   * The extra delay preserves its stagger relative to unstunned neighbours. */
  public override applyStun(now: number, durationMs: number): void {
    const before = this.stunEndsAt;
    super.applyStun(now, durationMs);
    if (this.aiState === 'defeated' || this.stunEndsAt <= Math.max(now, before)) return;
    const pause = (deadline: number) =>
      delayEnemyAttackForStun(deadline, now, before, this.stunEndsAt);
    this.nextShotAt = pause(this.nextShotAt);
    if (this.archerReleaseAt > 0) {
      const oldRelease = this.archerReleaseAt;
      this.archerReleaseAt = pause(this.archerReleaseAt);
      this.archerDrawStartedAt += this.archerReleaseAt - oldRelease;
    }
    this.nextSpecialAt = pause(this.nextSpecialAt);
    if (this.nextSnowfallAt > 0) this.nextSnowfallAt = pause(this.nextSnowfallAt);
    this.nextJadeBranchesAt = pause(this.nextJadeBranchesAt);
    if (Number.isFinite(this.nextSummonAt)) this.nextSummonAt = pause(this.nextSummonAt);
  }

  public get isBoss(): boolean { return this.kind === 'boss'; }
  public get isBlazehound(): boolean { return this.worldId === 3 && this.kind === 'charger'; }
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
  public get isBriarArcher(): boolean {
    return this.worldId === 1 && this.kind === 'archer';
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
  public get isJadeMatriarch(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 25;
  }
  public get isHeartOfGrove(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 30;
  }
  public get isRootTyrant(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 10;
  }
  public get isMossWarden(): boolean {
    return this.isBoss && this.worldId === 1 && this.roomNumber === 5;
  }
  /** World-1's small roller and room-5 boss share the same curl/roll language. */
  private get isForestRoller(): boolean {
    return this.isMossWarden || (this.worldId === 1 && this.kind === 'charger');
  }
  private get forestRollScale(): number { return this.isBoss ? 1.75 : 1; }
  private get forestRollTexture(): string {
    return this.isMossWarden ? 'world-1-boss-1-roll' : 'world-1-charger-roll';
  }
  private get forestIdleTexture(): string {
    return getWorldCharacter(this.worldId, this.kind, this.roomNumber, this.bossSlot).textureKey;
  }

  public updateAI(targetX: number, targetY: number, now: number,
    fire: EnemyFire, explode: EnemyExplosion, dropBombs?: EnemyBomb,
    coverTank?: Readonly<ShieldSurface>, summon?: EnemySummon,
    rootAttack?: EnemyRoot, trailBomb?: EnemyTrail,
    frozenSpecial?: (enemy: AdvancedEnemy, effect: 'boulder' | 'snow' | 'golems', count: number) => void,
    jadeBranches?: EnemyJadeBranches, emberBoss?: EnemyEmberBoss): void {
    if (this.aiState === 'defeated') return;
    super.chase(targetX, targetY);
    // A stunned enemy cannot shoot, summon or trigger scripted special attacks.
    // Its own cooldowns were deferred in applyStun; no global shoot clock.
    if (this.isStunned(now)) return;
    this.updateTimedSummons(now, summon, frozenSpecial);
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
    if (this.worldId === 3 && this.kind !== 'boss') {
      this.updateEmberMob(targetX, targetY, now, fire, explode, dropBombs, trailBomb);
      return;
    }
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
        this.archerAimAngle = Math.atan2(targetY - this.y, targetX - this.x);
        this.setFlipX(targetX < this.x);
        if (this.isBriarArcher && this.archerReleaseAt > 0) {
          // Stand firmly while drawing; release the real arrow at full tension.
          this.setVelocity(0, 0);
          if (now >= this.archerReleaseAt) {
            fire(this, 'single');
            this.archerReleaseAt = 0;
            this.nextShotAt = now + this.stats.attackIntervalMs;
          }
        } else if (this.isBriarArcher && now >= this.nextShotAt) {
          this.setVelocity(0, 0);
          this.archerDrawStartedAt = now;
          this.archerReleaseAt = now + BRIAR_ARCHER_DRAW_MS;
        } else {
          this.setVelocity(velocity.x, velocity.y);
          if (now >= this.nextShotAt) {
            fire(this, this.isFrostWitch || this.kind === 'archer' ? 'single' : 'double');
            this.nextShotAt = now + this.stats.attackIntervalMs;
          }
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
        if (this.worldId === 3) {
          this.updateEmberBoss(now, phase, move, fire, emberBoss);
          break;
        }
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
        // An ADDITIONAL attack, independent of the existing bullet-pattern
        // cycle: two warning lanes that grow across the chamber.
        if (this.isJadeMatriarch && now >= this.nextJadeBranchesAt) {
          jadeBranches?.(this);
          this.nextJadeBranchesAt = now + JADE_BRANCH.intervalMs;
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

  public override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.isBriarArcher) this.drawBriarBow(this.scene.time.now);
    if (!this.isForestRoller || !this.active || this.aiState === 'defeated') return;
    const now = this.scene.time.now;
    if (this.windupEndsAt > 0) {
      const duration = Math.max(1, this.windupEndsAt - this.windupStartedAt);
      const progress = Phaser.Math.Clamp((now - this.windupStartedAt) / duration, 0, 1);
      if (progress < .68) {
        const curl = progress / .68;
        if (this.texture.key !== this.forestIdleTexture) this.setTexture(this.forestIdleTexture);
        this.setScale(this.forestRollScale * (1 + curl * .14),
          this.forestRollScale * (1 - curl * .38));
        this.setAngle(Math.sin(curl * Math.PI) * (this.flipX ? 9 : -9));
      } else {
        const close = (progress - .68) / .32;
        if (this.texture.key !== this.forestRollTexture) this.setTexture(this.forestRollTexture);
        const scale = this.forestRollScale * (.72 + close * .28);
        this.setScale(scale);
        this.setAngle((this.flipX ? -1 : 1) * close * 35);
      }
      return;
    }
    if (this.dashEndsAt > 0) {
      if (this.texture.key !== this.forestRollTexture) this.setTexture(this.forestRollTexture);
      this.setScale(this.forestRollScale);
      const direction = this.dashX < 0 ? -1 : 1;
      this.setAngle(direction * (now - this.dashStartedAt) * .86);
    }
  }

  /** One cached overlay follows the moving archer. The string, nocked arrow
   * and both hands move through draw -> full tension -> snap release. */
  private drawBriarBow(now: number): void {
    const g = this.archerBow;
    if (!g || !g.active || !this.active || this.aiState === 'defeated') return;
    g.clear();
    g.setPosition(this.x, this.y);
    const ux = Math.cos(this.archerAimAngle), uy = Math.sin(this.archerAimAngle);
    const px = -uy, py = ux;
    const draw = this.isStunned(now) ? 0 : briarBowDrawAmount(now - this.archerDrawStartedAt);
    const gripX = ux * 12, gripY = uy * 12 + 2;
    const topX = gripX + px * 16 + ux * 2, topY = gripY + py * 16 + uy * 2;
    const bottomX = gripX - px * 16 + ux * 2, bottomY = gripY - py * 16 + uy * 2;
    const bellyX = gripX + ux * 8, bellyY = gripY + uy * 8;
    const pullX = gripX - ux * (2 + draw * 14), pullY = gripY - uy * (2 + draw * 14);
    // Rear drawing arm and forward bow arm visibly separate during the pull.
    g.lineStyle(7, 0x5f873a, 1);
    g.lineBetween(-ux * 3, -uy * 3 + 3, pullX, pullY);
    g.lineBetween(ux * 1, uy * 1 + 4, gripX, gripY);
    g.fillStyle(0xa1c75d); g.fillCircle(pullX, pullY, 3.5); g.fillCircle(gripX, gripY, 3.5);
    // Curved yew bow and taut string.
    g.lineStyle(3.4, 0x7a4b25, 1);
    g.beginPath(); g.moveTo(topX, topY); g.lineTo(bellyX, bellyY);
    g.lineTo(bottomX, bottomY); g.strokePath();
    g.lineStyle(1.4, 0xeee7c7, .96);
    g.lineBetween(topX, topY, pullX, pullY); g.lineBetween(pullX, pullY, bottomX, bottomY);
    // Nocked arrow remains aligned with the target and shoots from this pose.
    const arrowBackX = pullX - ux * 5, arrowBackY = pullY - uy * 5;
    const arrowTipX = gripX + ux * 27, arrowTipY = gripY + uy * 27;
    g.lineStyle(2.3, 0x9b6a36, 1); g.lineBetween(arrowBackX, arrowBackY, arrowTipX, arrowTipY);
    g.fillStyle(0xd8dde1); g.fillTriangle(arrowTipX + ux * 5, arrowTipY + uy * 5,
      arrowTipX + px * 3, arrowTipY + py * 3, arrowTipX - px * 3, arrowTipY - py * 3);
    g.fillStyle(0xdbe9b5);
    g.fillTriangle(arrowBackX, arrowBackY, arrowBackX - ux * 6 + px * 3,
      arrowBackY - uy * 6 + py * 3, arrowBackX - ux * 4, arrowBackY - uy * 4);
  }

  private resetForestRollVisual(): void {
    if (!this.isForestRoller || !this.active) return;
    this.setTexture(this.forestIdleTexture);
    this.setScale(this.forestRollScale);
    this.setAngle(0);
  }

  /** Shared initial and repeat-cast scheduling. Death-triggered splits are
   * intentionally not represented here and keep their old death handlers. */
  private updateTimedSummons(now: number, summon?: EnemySummon,
    frozenSpecial?: (enemy: AdvancedEnemy, effect: 'boulder' | 'snow' | 'golems', count: number) => void): void {
    const type = this.summonerType;
    if (!type || !summonIsDue(now, this.nextSummonAt)) return;
    if (type === 'frost-witch') {
      if (!summon) return;
      summon(this);
    } else {
      if (!frozenSpecial) return;
      const phase = bossPhase(this.healthRatio);
      frozenSpecial(this, 'golems', phase === 1
        ? FROZEN_BALANCE.sentinelPhaseOneCount
        : FROZEN_BALANCE.sentinelPhaseTwoCount);
    }
    this.nextSummonAt = nextSummonTime(now, type);
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

  /** Dedicated Ember Wastes roster: each internal slot has an exclusive fire identity. */
  private updateEmberMob(targetX: number, targetY: number, now: number,
    fire: EnemyFire, explode: EnemyExplosion, dropBombs?: EnemyBomb,
    flameTrail?: EnemyTrail): void {
    const speed = this.stats.movementSpeed * this.slowMultiplier;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    if (this.kind === 'archer') {
      const move = rangedVelocity(this.x, this.y, targetX, targetY, speed, 135, this.orbitSign);
      this.setVelocity(move.x, move.y);
      if (now >= this.nextShotAt && distance < 245) {
        fire(this, 'fan');
        this.nextShotAt = now + this.stats.attackIntervalMs;
      }
      return;
    }
    if (this.kind === 'mage') {
      const move = rangedVelocity(this.x, this.y, targetX, targetY, speed, 245, this.orbitSign);
      this.setVelocity(move.x, move.y);
      if (now >= this.nextShotAt) {
        fire(this, 'single');
        this.nextShotAt = now + this.stats.attackIntervalMs;
      }
      return;
    }
    if (this.kind === 'charger') {
      const move = getChaseVelocity(this.x, this.y, targetX, targetY, speed);
      this.setVelocity(move.x, move.y);
      this.setFlipX(move.x < 0);
      if (now >= this.nextTrailAt && Math.hypot(move.x, move.y) > 20) {
        flameTrail?.(this, this.x, this.y + 10);
        this.nextTrailAt = now + EMBER_ATTACKS.houndTrailSpacingMs;
      }
      return;
    }
    if (this.kind === 'tank') {
      if (distance <= EMBER_ATTACKS.bulwarkSlamRadius && now >= this.nextShotAt) {
        this.setVelocity(0, 0);
        explode(this, EMBER_ATTACKS.bulwarkSlamRadius);
        this.nextShotAt = now + this.stats.attackIntervalMs;
      }
      return;
    }
    if (this.kind === 'bomber') {
      const move = rangedVelocity(this.x, this.y, targetX, targetY, speed, 275, this.orbitSign);
      this.setVelocity(move.x, move.y);
      if (now >= this.nextShotAt) {
        dropBombs?.(this, targetX, targetY, 1,
          EMBER_ATTACKS.bomberRadius, EMBER_ATTACKS.bomberWindupMs);
        this.nextShotAt = now + this.stats.attackIntervalMs;
      }
    }
  }

  private updateEmberBoss(now: number, phase: 1 | 2,
    move: { x: number; y: number }, fire: EnemyFire, emberBoss?: EnemyEmberBoss): void {
    this.setVelocity(move.x * 0.72, move.y * 0.72);
    const attack = getEmberBossAttack(this.roomNumber, this.bossSlot);
    if (attack === 'pentaflare') {
      if (now >= this.nextShotAt) {
        fire(this, 'wide', this.bossVolleys, phase === 2 ? 1.18 : 1);
        this.bossVolleys++;
        this.nextShotAt = now + (phase === 2 ? 350 : EMBER_BOSS_ATTACKS.pentaflareIntervalMs);
      }
      return;
    }

    // The Broodmother keeps pressure between summons; all other bosses let
    // their signature attack fully own the encounter rhythm.
    if (attack === 'lava-summon' && now >= this.nextShotAt) {
      fire(this, phase === 2 ? 'fan' : 'double', this.bossVolleys, 0.9);
      this.bossVolleys++;
      this.nextShotAt = now + (phase === 2 ? 1050 : 1450);
    }
    if (now < this.nextSpecialAt || !emberBoss) return;
    emberBoss(this, attack, phase, this.bossVolleys);
    this.bossVolleys++;
    this.nextSpecialAt = now + (
      attack === 'spinning-lasers' ? EMBER_BOSS_ATTACKS.laserDurationMs + 1800 :
      attack === 'ground-fireball' ? (phase === 2 ? 1900 : 2700) :
      attack === 'edge-cannons' ? (phase === 2 ? 1900 : 2800) :
      attack === 'lava-summon' ? EMBER_BOSS_ATTACKS.lavaSummonIntervalMs :
      attack === 'lava-geysers' ? (phase === 2 ? 1800 : 2600) :
      phase === 2 ? 1550 : 2200);
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
    const tx = -ny, ty = nx;
    graphic.clear();
    // A bent branch arm visibly connects torso, hand and the physical shield.
    const elbowX = this.x + nx * 12 + tx * 9;
    const elbowY = this.y + ny * 12 + ty * 9;
    graphic.lineStyle(11, 0x392719, 1);
    graphic.lineBetween(this.x + tx * 8, this.y + ty * 8, elbowX, elbowY);
    graphic.lineBetween(elbowX, elbowY, centerX - nx * 4, centerY - ny * 4);
    graphic.lineStyle(6, 0x76532e, 1);
    graphic.lineBetween(this.x + tx * 8, this.y + ty * 8, elbowX, elbowY);
    graphic.lineBetween(elbowX, elbowY, centerX - nx * 4, centerY - ny * 4);
    // Thick rim plus four individual planks reads as a held tower shield.
    graphic.lineStyle(19, 0x263522, 1);
    graphic.lineBetween(a.x, a.y, b.x, b.y);
    graphic.lineStyle(15, 0x6f4b29, 1);
    graphic.lineBetween(a.x, a.y, b.x, b.y);
    for (const offset of [-31, -10, 11, 32]) {
      const px = centerX + tx * offset, py = centerY + ty * offset;
      graphic.lineStyle(4.5, offset % 2 ? 0xa47b43 : 0x8b6335, .98);
      graphic.lineBetween(px - nx * 7, py - ny * 7, px + nx * 8, py + ny * 8);
    }
    graphic.lineStyle(3, 0xc49a58, .88);
    graphic.lineBetween(a.x + nx * 7, a.y + ny * 7, b.x + nx * 7, b.y + ny * 7);
    // Iron rim pins, central boss plate, gripping hand and reinforcing brace.
    graphic.fillStyle(0xc7a76b, 1);
    for (const offset of [-38, -19, 19, 38])
      graphic.fillCircle(centerX + tx * offset + nx * 5, centerY + ty * offset + ny * 5, 2.5);
    graphic.fillStyle(0x647744, 1);
    graphic.fillCircle(centerX + nx * 6, centerY + ny * 6, 9);
    graphic.lineStyle(2, 0xfef3c7, 0.9);
    graphic.strokeCircle(centerX + nx * 6, centerY + ny * 6, 9);
    graphic.fillStyle(0x8c6638, 1);
    graphic.fillCircle(centerX - nx * 4, centerY - ny * 4, 5);
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
      this.dashStartedAt = 0;
      this.setVelocity(0, 0);
      this.resetForestRollVisual();
      this.nextSpecialAt = now + rechargeMs;
      return;
    }
    if (this.windupEndsAt > 0) {
      this.setVelocity(0, 0);
      if (!this.isForestRoller) this.drawWarning(70, 0xef4444);
      if (now >= this.windupEndsAt) {
        this.clearWarning();
        this.dashStartedAt = now;
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
      this.windupStartedAt = now;
      this.windupEndsAt = now + (this.isMossWarden ? MOSS_DASH.warningMs : this.isBoss ? 770 :
        CHARGER_DASH.telegraphMs);
      this.setVelocity(0, 0);
      if (!this.isForestRoller) this.drawWarning(70, 0xef4444);
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
    this.windupStartedAt = 0;
    this.warning?.destroy();
    this.warning = undefined;
  }
  public override playDefeat(): void {
    this.witchHat?.clear();
    this.archerBow?.clear();
    this.archerReleaseAt = 0;
    this.shieldGraphic?.clear();
    this.clearWarning();
    this.resetForestRollVisual();
    super.playDefeat();
  }
  public override destroy(fromScene?: boolean): void {
    this.witchHat?.destroy();
    this.witchHat = undefined;
    this.archerBow?.destroy();
    this.archerBow = undefined;
    this.shieldGraphic?.destroy();
    this.shieldGraphic = undefined;
    this.warning?.destroy();
    this.warning = undefined;
    super.destroy(fromScene);
  }
}

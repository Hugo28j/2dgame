import Phaser from 'phaser';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { Slime } from '../enemies/Slime';
import type { EnemyProjectile } from '../enemies/EnemyProjectile';
import type { ShieldPoint } from '../enemies/treantShield';
import type { Player } from '../entities/Player';
import type { InputController } from '../input/InputController';
import type { Vector2Value } from '../input/vectorMath';
import { AbilityCooldowns } from './AbilityCooldowns';
import {
  ABILITIES, HERO_ABILITIES, getAbilityStats, isAbilityUnlocked, isAimedAbility,
  type AbilityId, type AbilityStats,
} from './abilityConfig';
import { targetsInRadius } from './areaTargets';
import { DashState } from './DashState';
import { inForwardRectangle, normalizedDirection, rayHitsCircle } from './directedGeometry';
import { findTeleportDestination, safeBombBlastDistance } from './teleportDestination';
import type { RoomLayout } from '../rooms/roomConfig';

interface AbilityButton {
  readonly id: AbilityId; readonly x: number; readonly y: number;
  readonly background: Phaser.GameObjects.Arc; readonly icon: Phaser.GameObjects.Text;
  readonly hint: Phaser.GameObjects.Text; readonly cooldownText: Phaser.GameObjects.Text;
  readonly overlay: Phaser.GameObjects.Graphics;
}

interface AimHold {
  readonly id: AbilityId;
  readonly pointerId: number;
  readonly originX: number;
  readonly originY: number;
  direction: Vector2Value;
}

interface BombState {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly stats: Readonly<AbilityStats>;
  readonly sourceX: number;
  readonly sourceY: number;
  readonly maximumRange: number;
}

interface TrailPatch {
  readonly x: number; readonly y: number;
  readonly expiresAt: number;
  readonly visual: Phaser.GameObjects.Arc;
  readonly kind: 'ice' | 'fire';
}

interface Companion {
  readonly body: Phaser.GameObjects.Arc;
  readonly icon: Phaser.GameObjects.Text;
  readonly healthBar: Phaser.GameObjects.Graphics;
  readonly endsAt: number;
  readonly maxHp: number;
  hp: number;
  nextShotAt: number;
  nextHitAt: number;
}

export class AbilityController {
  private readonly cooldowns = new AbilityCooldowns();
  private readonly dash = new DashState();
  private readonly buttons: AbilityButton[] = [];
  private readonly scene: Phaser.Scene;
  private readonly slots: readonly [AbilityId, AbilityId, AbilityId];
  private readonly aimPreview: Phaser.GameObjects.Graphics;
  private readonly shieldVisual: Phaser.GameObjects.Graphics;
  private readonly shieldHud: Phaser.GameObjects.Text;
  private readonly trails: TrailPatch[] = [];
  private readonly bombs = new Set<BombState>();
  private readonly flameHitAt = new WeakMap<Slime, number>();
  private aimHold?: AimHold;
  private companion?: Companion;
  private activeDashSpeed = 0;
  private dashTrailKind?: 'ice' | 'fire';
  private trailUntil = 0;
  private nextTrailAt = 0;
  private timeWarpUntil = 0;

  public constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly heroLevel: number,
    private readonly abilityLevels: Readonly<Record<AbilityId, number>>,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly inputs: InputController,
    private readonly damageSystem: DamageSystem,
    private readonly showDamage: (x: number, y: number, result: DamageResult) => void,
    private readonly refreshHealth: () => void,
    private readonly blocked: () => boolean,
    private readonly enemyProjectiles?: Phaser.Physics.Arcade.Group,
    private readonly arenaLayout?: () => Pick<RoomLayout, 'bounds' | 'obstacles'> | undefined,
    private readonly protectingShield?: (origin: Readonly<ShieldPoint>, target: Slime) => Slime | undefined,
  ) {
    this.scene = scene;
    this.slots = HERO_ABILITIES[player.heroId];
    this.aimPreview = scene.add.graphics().setScrollFactor(0).setDepth(126);
    this.shieldVisual = scene.add.graphics().setDepth(22);
    this.shieldHud = scene.add.text(150, 53, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '10px', fontStyle: 'bold',
      color: '#fde68a', stroke: '#020617', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(121).setScrollFactor(0);

    this.slots.forEach((id, index) => {
      const config = ABILITIES[id];
      const unlocked = isAbilityUnlocked(id, heroLevel);
      const x = 232 + index * 59;
      const y = 655;
      const background = scene.add.circle(x, y, 22, 0x172338)
        .setStrokeStyle(2.5, unlocked ? config.color : 0x475569).setDepth(121)
        .setScrollFactor(0).setInteractive({ useHandCursor: unlocked });
      const icon = scene.add.text(x, y - 2, unlocked ? config.symbol : '🔒', {
        fontFamily: 'system-ui, sans-serif', fontSize: unlocked ? '23px' : '16px',
        fontStyle: 'bold', color: unlocked ? '#f8fafc' : '#94a3b8',
      }).setOrigin(0.5).setDepth(122).setScrollFactor(0);
      const action = index === 0 ? 'dash' : index === 1 ? 'fireNova' : 'iceBlast';
      const hint = scene.add.text(x, y + 30, unlocked
        ? this.inputs.getAbilityLabel(action) + (isAimedAbility(config.kind) ? ' ↗' : '')
        : 'LV.' + config.unlockLevel, {
        fontFamily: 'system-ui, sans-serif', fontSize: '10px',
        color: unlocked ? '#cbd5e1' : '#64748b',
      }).setOrigin(0.5).setDepth(122).setScrollFactor(0);
      const overlay = scene.add.graphics().setDepth(123).setScrollFactor(0);
      const cooldownText = scene.add.text(x, y, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#020617', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(124).setScrollFactor(0);

      background.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
        (pointer: Phaser.Input.Pointer) => this.onAbilityPointerDown(id, pointer));
      this.buttons.push({ id, x, y, background, icon, hint, overlay, cooldownText });
    });
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerRelease);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerRelease);
    this.refresh(scene.time.now);
  }

  public update(now: number, delta = 16): void {
    const actions = ['dash', 'fireNova', 'iceBlast'] as const;
    this.slots.forEach((id, index) => {
      const action = actions[index]!;
      const pressed = this.inputs.consumeAbilityPressed(action);
      const released = action !== 'dash' ? this.inputs.consumeAbilityReleased(action) : false;
      if (isAimedAbility(ABILITIES[id].kind) ? released : pressed) this.cast(id, now);
    });

    const velocity = this.dash.velocity(now, this.activeDashSpeed);
    if (velocity && !this.blocked()) this.player.setVelocity(velocity.x, velocity.y);
    if (this.dashTrailKind && now < this.trailUntil && !this.blocked() &&
      now >= this.nextTrailAt && velocity) {
      this.addTrailPatch(this.dashTrailKind, now);
      this.nextTrailAt = now + 32;
    }
    this.updateTrails(now);
    this.updateBombs();
    this.updateCompanion(now, delta);
    this.drawShield();
    if (now < this.timeWarpUntil && !this.blocked()) {
      for (const enemy of this.liveEnemies()) enemy.applySlow(now, 180, 0.33);
    }
    this.refresh(now);
  }

  /** Freezes all ability cooldowns as soon as the last enemy dies. */
  public pauseCooldowns(now: number): void {
    this.cooldowns.pause(now);
    this.refresh(now);
  }

  /** Continue from the remaining seconds when the next room starts. */
  public resumeCooldowns(now: number): void {
    this.cooldowns.resume(now);
    this.refresh(now);
  }

  /** Enemy projectiles are slowed too; friendly shots remain unaffected. */
  public enemyProjectileFactor(now: number): number {
    return !this.blocked() && now < this.timeWarpUntil ? 0.36 : 1;
  }

  public cancelMotion(): void {
    this.dash.cancel();
    this.dashTrailKind = undefined;
    this.timeWarpUntil = 0;
    this.aimHold = undefined;
    this.aimPreview.clear();
    for (const patch of this.trails) patch.visual.destroy();
    this.trails.length = 0;
    for (const bomb of this.bombs) bomb.sprite.destroy();
    this.bombs.clear();
    this.removeCompanion();
  }

  public destroy(): void {
    this.cancelMotion();
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerRelease);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerRelease);
    this.aimPreview.destroy();
    this.shieldVisual.destroy();
    this.shieldHud.destroy();
    for (const button of this.buttons) {
      button.background.removeAllListeners();
      button.background.destroy(); button.icon.destroy();
      button.hint.destroy(); button.overlay.destroy(); button.cooldownText.destroy();
    }
    this.buttons.length = 0;
  }

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.aimHold || this.aimHold.pointerId !== pointer.id || !pointer.isDown) return;
    this.updateAim(pointer);
  };

  private readonly onPointerRelease = (pointer: Phaser.Input.Pointer): void => {
    const hold = this.aimHold;
    if (!hold || hold.pointerId !== pointer.id) return;
    this.updateAim(pointer);
    this.aimHold = undefined;
    this.aimPreview.clear();
    this.cast(hold.id, this.scene.time.now, hold.direction);
  };

  private onAbilityPointerDown(id: AbilityId, pointer: Phaser.Input.Pointer): void {
    const now = this.scene.time.now;
    if (this.blocked() || !isAbilityUnlocked(id, this.heroLevel) ||
      !this.cooldowns.ready(id, now)) return;
    if (!isAimedAbility(ABILITIES[id].kind)) {
      this.cast(id, now);
      return;
    }
    // UI is camera-fixed. Drag away from the ability icon in the desired
    // direction, then release anywhere (even outside the game canvas).
    const button = this.buttons.find(item => item.id === id);
    if (!button || this.aimHold) return;
    this.aimHold = {
      id, pointerId: pointer.id, originX: button.x, originY: button.y,
      direction: this.inputs.getAim(this.player.x, this.player.y),
    };
    this.updateAim(pointer);
  }

  private updateAim(pointer: Phaser.Input.Pointer): void {
    const hold = this.aimHold;
    if (!hold) return;
    const dx = pointer.x - hold.originX;
    const dy = pointer.y - hold.originY;
    if (Math.hypot(dx, dy) > 15) hold.direction = normalizedDirection({ x: dx, y: dy });
    this.aimPreview.clear();
    const color = ABILITIES[hold.id].color;
    const reach = 80;
    this.aimPreview.lineStyle(5, color, 0.85);
    this.aimPreview.lineBetween(hold.originX, hold.originY,
      hold.originX + hold.direction.x * reach, hold.originY + hold.direction.y * reach);
    this.aimPreview.fillStyle(color, 0.95);
    this.aimPreview.fillCircle(
      hold.originX + hold.direction.x * reach,
      hold.originY + hold.direction.y * reach, 7);
  }

  private cast(id: AbilityId, now: number, directedAim?: Readonly<Vector2Value>): boolean {
    if (this.blocked() || !isAbilityUnlocked(id, this.heroLevel)) return false;
    const stats = this.stats(id);
    if (!this.cooldowns.ready(id, now)) return false;

    const move = this.inputs.getMovement();
    const aim = directedAim ?? this.inputs.getAim(this.player.x, this.player.y);
    const direction = normalizedDirection(
      (stats.kind === 'dash' || stats.kind === 'teleport') &&
      Math.hypot(move.x, move.y) > 0.1 ? move : aim);
    const layout = this.arenaLayout?.();
    const teleportLanding = stats.kind === 'teleport' && layout
      ? findTeleportDestination({ x: this.player.x, y: this.player.y },
        direction, 170, layout.bounds, layout.obstacles)
      : undefined;
    if (stats.kind === 'teleport' && (!teleportLanding ||
      Phaser.Math.Distance.Between(this.player.x, this.player.y,
        teleportLanding.x, teleportLanding.y) < 12)) return false;
    if (stats.kind === 'dash') {
      if (!this.dash.begin(now, stats.durationMs, direction)) return false;
      this.activeDashSpeed = stats.dashSpeed;
    }
    if (!this.cooldowns.activate(id, now, stats.cooldownMs, this.cooldownModifier(id))) {
      if (stats.kind === 'dash') this.dash.cancel();
      return false;
    }

    switch (stats.kind) {
      case 'shield':
        this.player.restoreShield();
        this.drawShield();
        this.pulse(this.player.x, this.player.y, 43, stats.color, 320);
        break;
      case 'teleport':
        if (teleportLanding) this.teleportTo(teleportLanding.x, teleportLanding.y, now, stats);
        break;
      case 'dash':
        this.player.beginInvulnerability(now, stats.invulnerabilityMs);
        this.pulse(this.player.x, this.player.y, 34, stats.color, 170);
        this.dashTrailKind = id === 'frost-dash' ? 'ice' : id === 'pyro-dash' ? 'fire' : undefined;
        this.trailUntil = now + stats.durationMs;
        this.nextTrailAt = now;
        if (this.dashTrailKind) this.addTrailPatch(this.dashTrailKind, now);
        break;
      case 'heal':
        this.player.heal(stats.heal);
        this.refreshHealth();
        this.player.beginInvulnerability(now, stats.invulnerabilityMs);
        this.pulse(this.player.x, this.player.y, stats.radius, stats.color, stats.durationMs);
        break;
      case 'rapidFire':
        this.player.boostAttackSpeed(now, stats.durationMs);
        this.pulse(this.player.x, this.player.y, 70, stats.color, 380);
        break;
      case 'sprint':
        this.player.boostMovementSpeed(now, stats.durationMs);
        this.pulse(this.player.x, this.player.y, 60, stats.color, 360);
        break;
      case 'timewarp':
        this.timeWarpUntil = now + stats.durationMs;
        this.pulse(this.player.x, this.player.y, 230, stats.color, 650);
        break;
      case 'companion':
        this.spawnCompanion(stats, now);
        break;
      case 'wind':
        if (id === 'guardian-slam') this.castGuardianPull(stats, now);
        else this.castWind(stats, now, direction);
        break;
      case 'shotgun':
        this.castShotgun(stats, direction);
        break;
      case 'bomb':
        this.throwBomb(stats, direction);
        break;
      default:
        if (id === 'guardian-aegis') this.castGuardianShockwave(stats, now);
        else this.areaEffect(stats, now);
    }

    this.refresh(now);
    return true;
  }

  private teleportTo(x: number, y: number, now: number, stats: Readonly<AbilityStats>): void {
    // This is a true instantaneous relocation: there are no intermediate
    // positions where a moving dash could be hit.
    this.dash.cancel();
    const fromX = this.player.x, fromY = this.player.y;
    this.pulse(fromX, fromY, 35, stats.color, 220);
    const body = this.player.body;
    if (body instanceof Phaser.Physics.Arcade.Body) body.reset(x, y);
    else this.player.setPosition(x, y);
    this.player.setVelocity(0, 0);
    this.player.beginInvulnerability(now, stats.invulnerabilityMs);
    this.pulse(x, y, 35, stats.color, 260);
  }

  private drawShield(): void {
    this.shieldVisual.clear();
    if (this.player.shieldHp <= 0) {
      this.shieldHud.setText('');
      return;
    }
    const ratio = this.player.shieldHp / this.player.maxShieldHp;
    this.shieldVisual.fillStyle(0x7dd3fc, 0.09 + 0.13 * ratio);
    this.shieldVisual.fillCircle(this.player.x, this.player.y, 39);
    this.shieldVisual.lineStyle(3, 0xfde68a, 0.5 + ratio * 0.5);
    this.shieldVisual.strokeCircle(this.player.x, this.player.y, 39);
    this.shieldHud.setText('🛡 ' + Math.ceil(this.player.shieldHp) + '/50');
  }

  private liveEnemies(): Slime[] {
    return this.enemies.getChildren().filter(
      (child): child is Slime => child instanceof Slime && child.active &&
        child.aiState !== 'defeated',
    );
  }

  private hitEnemy(enemy: Slime, stats: Readonly<AbilityStats>, power = 1,
    origin: Readonly<ShieldPoint> = this.player,
    struck?: Set<string>): Slime | undefined {
    if (!enemy.active || enemy.aiState === 'defeated') return undefined;
    // Wooden shields also stop blast pressure and magic in their shadow.
    // All redirected hits use the Treant's actual health, not a second pool.
    const receiver = this.protectingShield?.(origin, enemy) ?? enemy;
    if (!receiver.active || receiver.aiState === 'defeated') return undefined;
    if (struck?.has(receiver.enemyId)) return undefined;
    struck?.add(receiver.enemyId);
    const attack = {
      damage: (stats.damage * this.player.abilityDamageMultiplier +
        this.player.damage * 0.35) * power,
      criticalChance: this.player.criticalChance,
      criticalMultiplier: this.player.criticalMultiplier,
    };
    const result = this.damageSystem.apply(receiver, attack);
    this.showDamage(receiver.x, receiver.y, result);
    if (result.defeated) receiver.playDefeat();
    else receiver.showHit();
    return receiver;
  }

  private areaEffect(stats: Readonly<AbilityStats>, now: number): void {
    const targets = targetsInRadius(this.player.x, this.player.y, stats.radius, this.liveEnemies());
    const struck = new Set<string>();
    for (const enemy of targets) {
      const receiver = this.hitEnemy(enemy, stats, 1, this.player, struck);
      if (receiver && stats.kind === 'slow')
        receiver.applySlow(now, stats.durationMs, stats.slowFactor);
    }
    if (stats.kind === 'drain' && targets.length > 0) {
      this.player.heal(stats.heal);
      this.refreshHealth();
    }
    this.pulse(this.player.x, this.player.y, stats.radius, stats.color, stats.durationMs);
  }

  private castGuardianPull(stats: Readonly<AbilityStats>, now: number): void {
    const x = this.player.x, y = this.player.y;
    const victims = targetsInRadius(x, y, stats.radius, this.liveEnemies());
    const struck = new Set<string>();
    for (const enemy of victims) {
      const receiver = this.hitEnemy(enemy, stats, 1, this.player, struck);
      if (!receiver || receiver.aiState === 'defeated') continue;
      const dx = x - receiver.x, dy = y - receiver.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) receiver.applyKnockback(now, 330, dx / distance, dy / distance, 420);
      receiver.applyStun(now, 1000);
    }
    const ring = this.scene.add.circle(x, y, stats.radius, stats.color, 0.06)
      .setStrokeStyle(5, stats.color, 0.9).setDepth(27).setScale(1.1);
    this.scene.tweens.add({ targets: ring, scaleX: 0.15, scaleY: 0.15, alpha: 0,
      duration: 340, ease: 'Cubic.easeIn', onComplete: () => ring.destroy() });
  }

  private castGuardianShockwave(stats: Readonly<AbilityStats>, now: number): void {
    const x = this.player.x, y = this.player.y;
    const struck = new Set<string>();
    for (const enemy of targetsInRadius(x, y, stats.radius, this.liveEnemies())) {
      const receiver = this.hitEnemy(enemy, stats, 1.55, this.player, struck);
      if (!receiver || receiver.aiState === 'defeated') continue;
      const dx = receiver.x - x, dy = receiver.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.1) receiver.applyKnockback(now, 530, dx / distance, dy / distance, 570);
    }
    const ring = this.scene.add.circle(x, y, stats.radius, stats.color, 0.24)
      .setStrokeStyle(9, 0xffffff, 0.95).setDepth(28).setScale(0.04);
    const glow = this.scene.add.circle(x, y, stats.radius, stats.color, 0.18)
      .setStrokeStyle(4, stats.color, 0.8).setDepth(27).setScale(0.04);
    this.scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0,
      duration: 610, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.scene.tweens.add({ targets: glow, scaleX: 1.2, scaleY: 1.2, alpha: 0,
      duration: 740, ease: 'Quad.easeOut', onComplete: () => glow.destroy() });
  }

  private castWind(stats: Readonly<AbilityStats>, now: number,
    direction: Readonly<Vector2Value>): void {
    const x = this.player.x, y = this.player.y;
    const halfWidth = 49;
    const struck = new Set<string>();
    for (const enemy of this.liveEnemies()) {
      if (!inForwardRectangle(x, y, direction, enemy.x, enemy.y, stats.radius, halfWidth)) continue;
      const receiver = this.hitEnemy(enemy, stats, 1, this.player, struck);
      receiver?.applyKnockback(now, 420, direction.x, direction.y, 380);
    }
    const normalX = -direction.y * halfWidth;
    const normalY = direction.x * halfWidth;
    const points = [
      { x: x + normalX, y: y + normalY },
      { x: x + direction.x * stats.radius + normalX, y: y + direction.y * stats.radius + normalY },
      { x: x + direction.x * stats.radius - normalX, y: y + direction.y * stats.radius - normalY },
      { x: x - normalX, y: y - normalY },
    ];
    const flash = this.scene.add.graphics().setDepth(27);
    flash.fillStyle(stats.color, 0.24);
    flash.fillPoints(points.map(point => new Phaser.Math.Vector2(point.x, point.y)), true);
    flash.lineStyle(3, stats.color, 0.85);
    flash.strokePoints(points.map(point => new Phaser.Math.Vector2(point.x, point.y)), true);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 300,
      onComplete: () => flash.destroy() });
  }

  private castShotgun(stats: Readonly<AbilityStats>,
    direction: Readonly<Vector2Value>): void {
    const x = this.player.x, y = this.player.y;
    const angle = Math.atan2(direction.y, direction.x);
    const streaks = this.scene.add.graphics().setDepth(26);
    streaks.lineStyle(3, stats.color, 0.9);
    const pellets: Vector2Value[] = [];
    for (let i = -3; i <= 3; i++) {
      const a = angle + i * 0.11;
      const vector = { x: Math.cos(a), y: Math.sin(a) };
      pellets.push(vector);
      streaks.lineBetween(x + vector.x * 24, y + vector.y * 24,
        x + vector.x * stats.radius, y + vector.y * stats.radius);
    }
    for (const enemy of this.liveEnemies()) {
      const hitCount = pellets.filter(ray =>
        rayHitsCircle(x, y, ray, enemy.x, enemy.y, 20, stats.radius)).length;
      if (hitCount > 0) this.hitEnemy(enemy, stats, hitCount * 0.72);
    }
    this.scene.tweens.add({ targets: streaks, alpha: 0, duration: 185,
      onComplete: () => streaks.destroy() });
  }

  private throwBomb(stats: Readonly<AbilityStats>,
    direction: Readonly<Vector2Value>): void {
    // Physical flying projectile, launched in the chosen direction rather than
    // an AOE centred on the caster. Damage is only dealt at its distant impact.
    const dir = normalizedDirection(direction);
    const x = this.player.x + dir.x * 34;
    const y = this.player.y + dir.y * 34;
    const sprite = this.scene.physics.add.sprite(x, y, 'enemy-bullet')
      .setTint(stats.color).setScale(2.1).setDepth(29);
    const body = sprite.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setAllowGravity(false);
      body.setCircle(7, 1, 1);
    }
    sprite.setVelocity(dir.x * 510, dir.y * 510);
    this.bombs.add({
      sprite, stats, sourceX: this.player.x, sourceY: this.player.y,
      maximumRange: Math.max(360, stats.radius + 130),
    });
  }

  private updateBombs(): void {
    const layout = this.arenaLayout?.();
    for (const bomb of this.bombs) {
      const projectile = bomb.sprite;
      if (!projectile.active || this.blocked() || !layout) {
        this.removeBomb(bomb);
        continue;
      }
      const distance = Phaser.Math.Distance.Between(
        bomb.sourceX, bomb.sourceY, projectile.x, projectile.y);
      const armed = distance >= safeBombBlastDistance(bomb.stats.radius);
      const bounds = layout.bounds;
      const outside = projectile.x < bounds.x + 12 || projectile.x > bounds.x + bounds.width - 12 ||
        projectile.y < bounds.y + 12 || projectile.y > bounds.y + bounds.height - 12;
      const hitObstacle = layout.obstacles.some(o =>
        Math.abs(o.x - projectile.x) <= o.width / 2 + 9 &&
        Math.abs(o.y - projectile.y) <= o.height / 2 + 9);
      const hitEnemy = armed && this.liveEnemies().some(enemy =>
        Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y) <= 27);
      if (!outside && !hitObstacle && !hitEnemy && distance < bomb.maximumRange) continue;
      const x = projectile.x, y = projectile.y;
      this.removeBomb(bomb);
      // Fizzle near walls instead of exploding next to the player.
      if (!armed) continue;
      this.pulse(x, y, bomb.stats.radius, bomb.stats.color, 380);
      const struck = new Set<string>();
      for (const enemy of targetsInRadius(x, y, bomb.stats.radius, this.liveEnemies())) {
        this.hitEnemy(enemy, bomb.stats, 1, { x, y }, struck);
      }
    }
  }

  private removeBomb(bomb: BombState): void {
    bomb.sprite.destroy();
    this.bombs.delete(bomb);
  }

  private addTrailPatch(kind: 'ice' | 'fire', now: number): void {
    const x = this.player.x, y = this.player.y;
    const color = kind === 'ice' ? 0x67e8f9 : 0xfb923c;
    const visual = this.scene.add.circle(x, y, 29, color, 0.3)
      .setStrokeStyle(2, color, 0.75).setDepth(6);
    this.trails.push({ x, y, visual, kind, expiresAt: now + (kind === 'ice' ? 2400 : 1700) });
  }

  private updateTrails(now: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const patch = this.trails[i]!;
      if (now >= patch.expiresAt || this.blocked()) {
        patch.visual.destroy();
        this.trails.splice(i, 1);
        continue;
      }
      patch.visual.setAlpha(Math.max(0.05, (patch.expiresAt - now) /
        (patch.kind === 'ice' ? 2400 : 1700)));
      for (const enemy of this.liveEnemies()) {
        if (Phaser.Math.Distance.Between(patch.x, patch.y, enemy.x, enemy.y) > 36) continue;
        if (patch.kind === 'ice') enemy.applySlow(now, 190, 0.38);
        else if (now >= (this.flameHitAt.get(enemy) ?? 0)) {
          this.flameHitAt.set(enemy, now + 420);
          this.hitEnemy(enemy, this.stats('pyro-dash'), 1);
          // Dash damage is zero by default: the fire trail has a meaningful
          // fixed base even on a hero with little attack power.
          if (enemy.aiState !== 'defeated') {
            const attack = {
              damage: 10 * this.player.abilityDamageMultiplier,
              criticalChance: 0, criticalMultiplier: 1,
            };
            const result = this.damageSystem.apply(enemy, attack);
            this.showDamage(enemy.x, enemy.y, result);
            if (result.defeated) enemy.playDefeat();
          }
        }
      }
    }
  }

  private spawnCompanion(stats: Readonly<AbilityStats>, now: number): void {
    this.removeCompanion();
    const x = this.player.x + 43, y = this.player.y - 35;
    const maxHp = 65 + this.heroLevel * 5;
    this.companion = {
      body: this.scene.add.circle(x, y, 21, 0x64748b, 0.95)
        .setStrokeStyle(3, stats.color).setDepth(22),
      icon: this.scene.add.text(x, y, '🐺', { fontSize: '23px' })
        .setOrigin(0.5).setDepth(23),
      healthBar: this.scene.add.graphics().setDepth(24),
      maxHp, hp: maxHp, endsAt: now + stats.durationMs,
      nextShotAt: now + 340, nextHitAt: now + 700,
    };
    this.pulse(x, y, 48, stats.color, 340);
  }

  private updateCompanion(now: number, delta: number): void {
    const companion = this.companion;
    if (!companion) return;
    if (this.blocked() || now >= companion.endsAt || companion.hp <= 0) {
      this.removeCompanion();
      return;
    }
    const factor = Math.min(1, delta / 170);
    const destX = this.player.x + 45;
    const destY = this.player.y - 40;
    companion.body.setPosition(
      Phaser.Math.Linear(companion.body.x, destX, factor),
      Phaser.Math.Linear(companion.body.y, destY, factor));
    companion.icon.setPosition(companion.body.x, companion.body.y);
    const x = companion.body.x, y = companion.body.y;

    const enemies = this.liveEnemies();
    if (now >= companion.nextShotAt) {
      const nearest = enemies
        .filter(enemy => Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < 320)
        .sort((a, b) => Phaser.Math.Distance.Between(x, y, a.x, a.y) -
          Phaser.Math.Distance.Between(x, y, b.x, b.y))[0];
      if (nearest) {
        const beam = this.scene.add.graphics().setDepth(24);
        beam.lineStyle(4, 0xa5f3fc, 0.9);
        beam.lineBetween(x, y, nearest.x, nearest.y);
        this.scene.tweens.add({ targets: beam, alpha: 0, duration: 165,
          onComplete: () => beam.destroy() });
        const result = this.damageSystem.apply(nearest, {
          damage: 18 + this.player.damage * 0.65, criticalChance: 0.1,
          criticalMultiplier: 1.5,
        });
        this.showDamage(nearest.x, nearest.y, result);
        if (result.defeated) nearest.playDefeat();
        else nearest.showHit();
      }
      companion.nextShotAt = now + 680;
    }
    if (now >= companion.nextHitAt) {
      const touching = enemies.find(enemy =>
        Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < 38);
      if (touching) {
        companion.hp -= Math.max(4, touching.contactAttack.damage * 0.65);
        companion.nextHitAt = now + 800;
        companion.body.setStrokeStyle(3, 0xf87171);
      } else companion.body.setStrokeStyle(3, 0x38bdf8);
    }
    for (const bullet of this.enemyProjectiles?.getChildren() ?? []) {
      const shot = bullet as EnemyProjectile;
      if (!shot.active || Phaser.Math.Distance.Between(x, y, shot.x, shot.y) > 25) continue;
      companion.hp -= shot.attack.damage;
      shot.destroy();
    }
    companion.healthBar.clear();
    companion.healthBar.fillStyle(0x0f172a, 0.9);
    companion.healthBar.fillRect(x - 23, y - 34, 46, 6);
    companion.healthBar.fillStyle(0x22c55e);
    companion.healthBar.fillRect(x - 22, y - 33,
      44 * Math.max(0, companion.hp / companion.maxHp), 4);
    if (companion.hp <= 0) this.removeCompanion();
  }

  private removeCompanion(): void {
    if (!this.companion) return;
    this.companion.body.destroy();
    this.companion.icon.destroy();
    this.companion.healthBar.destroy();
    this.companion = undefined;
  }

  /** Shield Bubble has exactly a 30-second base cooldown for the Guardian. */
  private cooldownModifier(id: AbilityId): number {
    return id === 'guardian-charge' ? 1 : this.player.abilityCooldownModifier;
  }

  private stats(id: AbilityId): AbilityStats {
    return getAbilityStats(id, this.abilityLevels[id]);
  }

  private pulse(x: number, y: number, radius: number, color: number, duration: number): void {
    const circle = this.scene.add.circle(x, y, radius, color, 0.15)
      .setStrokeStyle(4, color, 0.9).setScale(0.1).setDepth(28);
    this.scene.tweens.add({ targets: circle, scaleX: 1, scaleY: 1, alpha: 0,
      duration: Math.min(650, Math.max(170, duration)), ease: 'Quad.easeOut',
      onComplete: () => circle.destroy() });
  }

  private refresh(now: number): void {
    for (const button of this.buttons) {
      const config = ABILITIES[button.id];
      const unlocked = isAbilityUnlocked(button.id, this.heroLevel);
      const stats = this.stats(button.id);
      const remaining = this.cooldowns.remainingMs(button.id, now);
      const total = stats.cooldownMs * this.cooldownModifier(button.id);
      button.overlay.clear();
      button.background.setFillStyle(!unlocked ? 0x0f172a : remaining > 0 ? 0x111827 : 0x172338);
      button.icon.setAlpha(!unlocked ? 0.45 : remaining > 0 ? 0.35 : 1);
      if (unlocked && remaining > 0) {
        button.overlay.lineStyle(4, config.color, 0.9);
        button.overlay.beginPath();
        button.overlay.arc(button.x, button.y, 24, -Math.PI / 2,
          -Math.PI / 2 + 2 * Math.PI * (1 - remaining / total));
        button.overlay.strokePath();
        button.cooldownText.setText((Math.ceil(remaining / 100) / 10).toFixed(1));
      } else button.cooldownText.setText('');
    }
  }
}

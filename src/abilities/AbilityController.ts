import Phaser from 'phaser';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { Slime } from '../enemies/Slime';
import type { Player } from '../entities/Player';
import type { InputController } from '../input/InputController';
import { AbilityCooldowns } from './AbilityCooldowns';
import {
  ABILITIES, HERO_ABILITIES, getAbilityStats, isAbilityUnlocked, type AbilityId, type AbilityStats,
} from './abilityConfig';
import { targetsInRadius } from './areaTargets';
import { DashState } from './DashState';

interface AbilityButton {
  readonly id: AbilityId; readonly x: number; readonly y: number;
  readonly background: Phaser.GameObjects.Arc; readonly icon: Phaser.GameObjects.Text;
  readonly hint: Phaser.GameObjects.Text; readonly cooldownText: Phaser.GameObjects.Text;
  readonly overlay: Phaser.GameObjects.Graphics;
}

export class AbilityController {
  private readonly cooldowns = new AbilityCooldowns();
  private readonly dash = new DashState();
  private readonly buttons: AbilityButton[] = [];
  private readonly scene: Phaser.Scene;
  private readonly slots: readonly [AbilityId, AbilityId, AbilityId];
  private activeDashSpeed = 0;

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
  ) {
    this.scene = scene;
    this.slots = HERO_ABILITIES[player.heroId];

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
      const hint = scene.add.text(x, y + 30, unlocked ? this.inputs.getAbilityLabel(action) :
        'LV.' + config.unlockLevel, {
        fontFamily: 'system-ui, sans-serif', fontSize: '10px',
        color: unlocked ? '#cbd5e1' : '#64748b',
      }).setOrigin(0.5).setDepth(122).setScrollFactor(0);
      const overlay = scene.add.graphics().setDepth(123).setScrollFactor(0);
      const cooldownText = scene.add.text(x, y, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#020617', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(124).setScrollFactor(0);

      background.on('pointerdown', () => this.cast(id, scene.time.now));
      this.buttons.push({ id, x, y, background, icon, hint, overlay, cooldownText });
    });
    this.refresh(this.scene.time.now);
  }

  public update(now: number): void {
    const actions = ['dash', 'fireNova', 'iceBlast'] as const;
    this.slots.forEach((id, index) => {
      const action = actions[index];
      if (action && this.inputs.consumeAbilityPressed(action)) this.cast(id, now);
    });

    const velocity = this.dash.velocity(now, this.activeDashSpeed);
    if (velocity && !this.blocked()) this.player.setVelocity(velocity.x, velocity.y);
    this.refresh(now);
  }

  public cancelMotion(): void { this.dash.cancel(); }

  public destroy(): void {
    this.dash.cancel();
    for (const button of this.buttons) {
      button.background.removeAllListeners(); button.background.destroy(); button.icon.destroy();
      button.hint.destroy(); button.overlay.destroy(); button.cooldownText.destroy();
    }
    this.buttons.length = 0;
  }

  private cast(id: AbilityId, now: number): boolean {
    if (this.blocked() || !isAbilityUnlocked(id, this.heroLevel)) return false;
    const stats = this.stats(id);
    if (!this.cooldowns.ready(id, now)) return false;

    const move = this.inputs.getMovement();
    const aim = this.inputs.getAim(this.player.x, this.player.y);
    const direction = Math.hypot(move.x, move.y) > 0.1 ? move : aim;
    if (stats.kind === 'dash') {
      if (!this.dash.begin(now, stats.durationMs, direction)) return false;
      this.activeDashSpeed = stats.dashSpeed;
    }
    if (!this.cooldowns.activate(id, now, stats.cooldownMs, this.player.abilityCooldownModifier)) {
      if (stats.kind === 'dash') this.dash.cancel();
      return false;
    }

    if (stats.kind === 'dash') {
      this.player.beginInvulnerability(now, stats.invulnerabilityMs);
      this.pulse(this.player.x, this.player.y, 34, stats.color, 170);
    } else if (stats.kind === 'heal') {
      this.player.heal(stats.heal);
      this.refreshHealth();
      this.player.beginInvulnerability(now, stats.invulnerabilityMs);
      this.pulse(this.player.x, this.player.y, stats.radius, stats.color, stats.durationMs);
    } else this.areaEffect(stats, now);

    this.refresh(now);
    return true;
  }

  private areaEffect(stats: Readonly<AbilityStats>, now: number): void {
    const enemies = this.enemies.getChildren().filter(
      (child): child is Slime => child instanceof Slime && child.aiState !== 'defeated',
    );
    const targets = targetsInRadius(this.player.x, this.player.y, stats.radius, enemies);
    const attack = {
      damage: stats.damage * this.player.abilityDamageMultiplier + this.player.damage * 0.35,
      criticalChance: this.player.criticalChance,
      criticalMultiplier: this.player.criticalMultiplier,
    };
    for (const enemy of targets) {
      const result = this.damageSystem.apply(enemy, attack);
      this.showDamage(enemy.x, enemy.y, result);
      if (result.defeated) enemy.playDefeat();
      else {
        if (stats.kind === 'slow') enemy.applySlow(now, stats.durationMs, stats.slowFactor);
        enemy.showHit();
      }
    }
    if (stats.kind === 'drain' && targets.length > 0) {
      this.player.heal(stats.heal);
      this.refreshHealth();
    }
    this.pulse(this.player.x, this.player.y, stats.radius, stats.color, stats.durationMs);
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
      const total = stats.cooldownMs * this.player.abilityCooldownModifier;
      button.overlay.clear();
      button.background.setFillStyle(!unlocked ? 0x0f172a : remaining > 0 ? 0x111827 : 0x172338);
      button.icon.setAlpha(!unlocked ? 0.45 : remaining > 0 ? 0.35 : 1);
      if (unlocked && remaining > 0) {
        button.overlay.lineStyle(4, config.color, 0.9); button.overlay.beginPath();
        button.overlay.arc(button.x, button.y, 24, -Math.PI / 2,
          -Math.PI / 2 + 2 * Math.PI * (1 - remaining / total));
        button.overlay.strokePath();
        button.cooldownText.setText((Math.ceil(remaining / 100) / 10).toFixed(1));
      } else button.cooldownText.setText('');
    }
  }
}

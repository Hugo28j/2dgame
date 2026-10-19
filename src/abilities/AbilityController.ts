import Phaser from 'phaser';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { Slime } from '../enemies/Slime';
import type { Player } from '../entities/Player';
import type { InputController } from '../input/InputController';
import type { Vector2Value } from '../input/vectorMath';
import { AbilityCooldowns } from './AbilityCooldowns';
import {
  ABILITIES, ABILITY_SLOTS, DASH_IFRAME_MS, DASH_SPEED, ICE_SLOW_FACTOR,
  type AbilityId,
} from './abilityConfig';
import { targetsInRadius } from './areaTargets';
import { DashState } from './DashState';

interface AbilityButton {
  readonly id: AbilityId;
  readonly x: number;
  readonly y: number;
  readonly background: Phaser.GameObjects.Arc;
  readonly icon: Phaser.GameObjects.Text;
  readonly hint: Phaser.GameObjects.Text;
  readonly cooldownText: Phaser.GameObjects.Text;
  readonly overlay: Phaser.GameObjects.Graphics;
}

export class AbilityController {
  private readonly cooldowns = new AbilityCooldowns();
  private readonly dash = new DashState();
  private readonly keys: Phaser.Input.Keyboard.Key[] = [];
  private readonly buttons: AbilityButton[] = [];
  private readonly scene: Phaser.Scene;

  public constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly inputs: InputController,
    private readonly damageSystem: DamageSystem,
    private readonly showDamage: (x: number, y: number, result: DamageResult) => void,
    private readonly blocked: () => boolean,
  ) {
    this.scene = scene;

    const keyboard = scene.input.keyboard;
    if (keyboard) {
      for (const code of [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
      ]) {
        this.keys.push(keyboard.addKey(code));
      }
    }

    // The ability hit circles end before the right joystick's interactive zone starts.
    // Phaser activePointers=4 allows both sticks plus a third finger for abilities.
    ABILITY_SLOTS.forEach((id, index) => {
      const config = ABILITIES[id];
      const x = 232 + index * 59;
      const y = 655;
      const background = scene.add.circle(x, y, 22, 0x172338)
        .setStrokeStyle(2.5, config.color).setDepth(121)
        .setInteractive({ useHandCursor: true });
      const icon = scene.add.text(x, y - 2, config.symbol, {
        fontFamily: 'system-ui, sans-serif', fontSize: '23px',
        fontStyle: 'bold', color: '#f8fafc',
      }).setOrigin(0.5).setDepth(122);
      const hint = scene.add.text(x, y + 30, String(index + 1), {
        fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#cbd5e1',
      }).setOrigin(0.5).setDepth(122);
      const overlay = scene.add.graphics().setDepth(123);
      const cooldownText = scene.add.text(x, y, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px',
        fontStyle: 'bold', color: '#ffffff',
        stroke: '#020617', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(124);

      background.on('pointerdown', () => this.cast(id, scene.time.now));
      this.buttons.push({ id, x, y, background, icon, hint, overlay, cooldownText });
    });
    this.refresh(this.scene.time.now);
  }

  public update(now: number): void {
    // JustDown works independently of both joystick pointers and mouse firing.
    for (let i = 0; i < this.keys.length; i += 1) {
      const key = this.keys[i];
      const id = ABILITY_SLOTS[i];
      if (key && id && Phaser.Input.Keyboard.JustDown(key)) this.cast(id, now);
    }

    const velocity = this.dash.velocity(now, DASH_SPEED);
    if (velocity && !this.blocked()) this.player.setVelocity(velocity.x, velocity.y);
    this.refresh(now);
  }

  public cancelMotion(): void {
    this.dash.cancel();
  }

  public destroy(): void {
    this.dash.cancel();
    for (const key of this.keys) this.scene.input.keyboard?.removeKey(key.keyCode);
    for (const button of this.buttons) {
      button.background.removeAllListeners();
      button.background.destroy();
      button.icon.destroy();
      button.hint.destroy();
      button.overlay.destroy();
      button.cooldownText.destroy();
    }
    this.buttons.length = 0;
  }

  private cast(id: AbilityId, now: number): boolean {
    if (this.blocked()) return false;
    const ability = ABILITIES[id];

    // Establish a meaningful direction before spending the dash cooldown.
    const move = this.inputs.getMovement();
    const aim = this.inputs.getAim(this.player.x, this.player.y);
    const direction = Math.hypot(move.x, move.y) > 0.1 ? move : aim;
    if (id === 'dash' && !this.dash.begin(now, ability.durationMs, direction)) return false;

    if (!this.cooldowns.activate(id, now, this.player.abilityCooldownModifier)) {
      if (id === 'dash') this.dash.cancel();
      return false;
    }

    if (id === 'dash') {
      // Only the first part of the dash grants invulnerability.
      this.player.beginInvulnerability(now, DASH_IFRAME_MS);
      this.pulse(this.player.x, this.player.y, 32, ability.color, 170);
    } else if (id === 'fire-nova') {
      this.areaEffect(id, now);
    } else if (id === 'ice-blast') {
      this.areaEffect(id, now);
    }

    this.refresh(now);
    return true;
  }

  private areaEffect(id: 'fire-nova' | 'ice-blast', now: number): void {
    const config = ABILITIES[id];
    const x = this.player.x;
    const y = this.player.y;
    const enemies = this.enemies.getChildren().filter(
      (child): child is Slime => child instanceof Slime && child.aiState !== 'defeated',
    );
    const targets = targetsInRadius(x, y, config.radius, enemies);
    const attack = {
      damage: config.damage * this.player.abilityDamageMultiplier + this.player.damage * 0.35,
      criticalChance: this.player.criticalChance,
      criticalMultiplier: this.player.criticalMultiplier,
    };

    for (const enemy of targets) {
      // Every enemy appears only once in this list: no repeated AoE hits in one cast.
      const result = this.damageSystem.apply(enemy, attack);
      this.showDamage(enemy.x, enemy.y, result);
      if (result.defeated) enemy.playDefeat();
      else {
        if (id === 'ice-blast') enemy.applySlow(now, config.durationMs, ICE_SLOW_FACTOR);
        enemy.showHit();
      }
    }
    this.pulse(x, y, config.radius, config.color, id === 'fire-nova' ? 300 : 420);
  }

  private pulse(x: number, y: number, radius: number, color: number, duration: number): void {
    const circle = this.scene.add.circle(x, y, radius, color, 0.15)
      .setStrokeStyle(4, color, 0.9)
      .setScale(0.1).setDepth(28);
    this.scene.tweens.add({
      targets: circle, scaleX: 1, scaleY: 1, alpha: 0,
      duration, ease: 'Quad.easeOut', onComplete: () => circle.destroy(),
    });
  }

  private refresh(now: number): void {
    for (const button of this.buttons) {
      const config = ABILITIES[button.id];
      const remaining = this.cooldowns.remainingMs(button.id, now);
      const total = config.cooldownMs * this.player.abilityCooldownModifier;
      button.overlay.clear();
      button.background.setFillStyle(remaining > 0 ? 0x111827 : 0x172338);
      button.icon.setAlpha(remaining > 0 ? 0.35 : 1);
      if (remaining > 0) {
        button.overlay.lineStyle(4, config.color, 0.9);
        button.overlay.beginPath();
        button.overlay.arc(
          button.x, button.y, 24, -Math.PI / 2,
          -Math.PI / 2 + 2 * Math.PI * (1 - remaining / total),
        );
        button.overlay.strokePath();
        button.cooldownText.setText((Math.ceil(remaining / 100) / 10).toFixed(1));
      } else button.cooldownText.setText('');
    }
  }
}

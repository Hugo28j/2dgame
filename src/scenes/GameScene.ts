import Phaser from 'phaser';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { GAME_SCENE_KEY, GAME_TITLE } from '../config/constants';
import { ARENA_BOUNDS } from '../config/gameplay';
import { EnemySpawner } from '../enemies/EnemySpawner';
import { SLIME_CONFIG, SLIME_SPAWN_POINTS } from '../enemies/enemyConfig';
import {
  ENEMY_DEFEATED_EVENT,
  ENEMY_SPAWNED_EVENT,
  Slime,
} from '../enemies/Slime';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { InputController } from '../input/InputController';
import { BowWeapon } from '../weapons/BowWeapon';
import { BOW_CONFIG } from '../weapons/weaponConfig';

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private controls?: InputController;
  private weapon?: BowWeapon;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private enemies?: Phaser.Physics.Arcade.Group;
  private enemySpawner?: EnemySpawner;
  private healthBar?: Phaser.GameObjects.Graphics;
  private healthText?: Phaser.GameObjects.Text;
  private enemyCountText?: Phaser.GameObjects.Text;
  private aliveEnemies = 0;
  private gameOver = false;
  private readonly damageSystem = new DamageSystem();

  public constructor() {
    super(GAME_SCENE_KEY);
  }

  public create(): void {
    this.drawBackdrop();
    this.physics.world.setBounds(
      ARENA_BOUNDS.x,
      ARENA_BOUNDS.y,
      ARENA_BOUNDS.width,
      ARENA_BOUNDS.height,
      true,
      true,
      true,
      true,
    );

    this.player = new Player(
      this,
      ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2,
      ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2,
    );
    this.controls = new InputController(this);
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false });
    this.weapon = new BowWeapon(this, this.player, this.projectiles);
    this.enemySpawner = new EnemySpawner(this, this.enemies);
    this.events.on(ENEMY_SPAWNED_EVENT, this.handleEnemySpawned);
    this.events.on(ENEMY_DEFEATED_EVENT, this.handleEnemyDefeated);
    this.enemySpawner.spawnSlimes(SLIME_SPAWN_POINTS);
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleProjectileHit,
      undefined,
      this,
    );
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerContact, undefined, this);
    this.physics.add.collider(this.enemies, this.enemies);
    this.drawPlayerHealth();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  public override update(): void {
    if (
      !this.player ||
      !this.controls ||
      !this.weapon ||
      !this.projectiles ||
      !this.enemies
    ) {
      return;
    }

    if (this.gameOver) {
      this.player.setVelocity(0, 0);
      return;
    }

    this.player.move(this.controls.getMovement());
    const aim = this.controls.getAim(this.player.x, this.player.y);
    this.player.face(aim);
    this.weapon.update(this.time.now, this.controls.isShooting(), aim);

    for (const child of this.enemies.getChildren()) {
      if (child instanceof Slime) {
        child.chase(this.player.x, this.player.y);
      }
    }

    for (const child of this.projectiles.getChildren()) {
      if (child instanceof Projectile && child.isOutsideArena()) {
        child.destroy();
      }
    }
  }

  private drawBackdrop(): void {
    this.cameras.main.setBackgroundColor('#08111f');

    this.add
      .text(18, 24, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
      })
      .setDepth(10);

    this.add
      .text(372, 18, 'KAMER 1', {
        color: '#7dd3fc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.enemyCountText = this.add
      .text(372, 42, 'SLIMES 0', {
        color: '#bef264',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.add
      .rectangle(
        ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2,
        ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2,
        ARENA_BOUNDS.width,
        ARENA_BOUNDS.height,
        0x142033,
      )
      .setStrokeStyle(6, 0x334155)
      .setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0x26364c, 0.55);

    for (let x = ARENA_BOUNDS.x + 30; x < ARENA_BOUNDS.x + ARENA_BOUNDS.width; x += 30) {
      grid.lineBetween(x, ARENA_BOUNDS.y, x, ARENA_BOUNDS.y + ARENA_BOUNDS.height);
    }

    for (let y = ARENA_BOUNDS.y + 30; y < ARENA_BOUNDS.y + ARENA_BOUNDS.height; y += 30) {
      grid.lineBetween(ARENA_BOUNDS.x, y, ARENA_BOUNDS.x + ARENA_BOUNDS.width, y);
    }

    this.add
      .text(195, 658, 'WASD · muis + linksklik', {
        color: '#64748b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(195, 62, `${BOW_CONFIG.name} · LV.${BOW_CONFIG.upgradeLevel}`, {
        color: '#fbbf24',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private readonly handleProjectileHit = (
    projectileObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    targetObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ): void => {
    if (!(projectileObject instanceof Projectile) || !(targetObject instanceof Slime)) {
      return;
    }

    if (!projectileObject.registerHit(targetObject.enemyId)) {
      return;
    }

    const result = this.damageSystem.apply(targetObject, projectileObject.attack);
    this.showDamageNumber(targetObject.x, targetObject.y, result);

    if (result.defeated) {
      targetObject.playDefeat();
    } else {
      targetObject.showHit();
    }
  };

  private readonly handlePlayerContact = (
    playerObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    enemyObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ): void => {
    if (!(playerObject instanceof Player) || !(enemyObject instanceof Slime)) {
      return;
    }

    const now = this.time.now;
    if (!playerObject.canReceiveContactDamage(now) || enemyObject.aiState === 'defeated') {
      return;
    }

    const result = this.damageSystem.apply(playerObject, enemyObject.contactAttack);
    playerObject.beginInvulnerability(now, SLIME_CONFIG.attackIntervalMs);
    this.drawPlayerHealth();

    if (result.defeated) {
      this.endRun();
    } else {
      this.showPlayerHit();
    }
  };

  private readonly handleEnemySpawned = (): void => {
    this.aliveEnemies += 1;
    this.updateEnemyCount();
  };

  private readonly handleEnemyDefeated = (): void => {
    this.aliveEnemies = Math.max(0, this.aliveEnemies - 1);
    this.updateEnemyCount();

    if (this.aliveEnemies === 0 && !this.gameOver) {
      this.add
        .text(195, 350, 'ARENA VEILIG', {
          color: '#bef264',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          stroke: '#020617',
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(60);
    }
  };

  private showDamageNumber(x: number, y: number, result: DamageResult): void {
    const text = this.add
      .text(x, y - 20, `${result.amount}${result.critical ? '!' : ''}`, {
        color: result.critical ? '#fde047' : '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: result.critical ? '20px' : '16px',
        fontStyle: 'bold',
        stroke: '#020617',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: text,
      y: y - 52,
      alpha: 0,
      duration: 550,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private drawPlayerHealth(): void {
    if (!this.player) {
      return;
    }

    const ratio = this.player.currentHp / this.player.maxHp;
    this.healthBar ??= this.add.graphics().setDepth(20);
    this.healthBar.clear();
    this.healthBar.fillStyle(0x020617, 0.95);
    this.healthBar.fillRoundedRect(18, 47, 122, 12, 4);
    this.healthBar.fillStyle(ratio > 0.3 ? 0x22c55e : 0xef4444, 1);
    this.healthBar.fillRoundedRect(20, 49, 118 * ratio, 8, 3);

    this.healthText ??= this.add
      .text(79, 53, '', {
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.healthText.setText(`${this.player.currentHp} / ${this.player.maxHp}`);
  }

  private showPlayerHit(): void {
    if (!this.player) {
      return;
    }

    this.player.setTint(0xef4444).setTintMode(Phaser.TintModes.FILL);
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 80,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.player?.setAlpha(1),
    });
    this.time.delayedCall(100, () => {
      if (this.player?.active && !this.gameOver) {
        this.player.clearTint();
      }
    });
  }

  private updateEnemyCount(): void {
    this.enemyCountText?.setText(`SLIMES ${this.aliveEnemies}`);
  }

  private endRun(): void {
    if (!this.player || this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.player.setTint(0x7f1d1d).setTintMode(Phaser.TintModes.FILL);

    for (const child of this.enemies?.getChildren() ?? []) {
      if (child instanceof Slime) {
        child.setVelocity(0, 0);
      }
    }

    this.add
      .rectangle(195, 361, 300, 128, 0x020617, 0.9)
      .setStrokeStyle(2, 0xef4444)
      .setDepth(70);
    this.add
      .text(195, 338, 'VERSLAGEN', {
        color: '#fca5a5',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(71);
    this.add
      .text(195, 383, 'Tik om opnieuw te proberen', {
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      })
      .setOrigin(0.5)
      .setDepth(71);

    this.time.delayedCall(400, () => {
      this.input.once(Phaser.Input.Events.POINTER_DOWN, () => this.scene.restart());
    });
  }

  private shutdown(): void {
    this.controls?.destroy();
    this.projectiles?.clear(true, true);
    this.enemies?.clear(true, true);
    this.events.off(ENEMY_SPAWNED_EVENT, this.handleEnemySpawned);
    this.events.off(ENEMY_DEFEATED_EVENT, this.handleEnemyDefeated);
    this.controls = undefined;
    this.weapon = undefined;
    this.projectiles = undefined;
    this.enemies = undefined;
    this.enemySpawner = undefined;
    this.healthBar = undefined;
    this.healthText = undefined;
    this.enemyCountText = undefined;
    this.player = undefined;
  }
}

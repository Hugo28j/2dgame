import Phaser from 'phaser';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { GAME_SCENE_KEY, GAME_TITLE } from '../config/constants';
import { ARENA_BOUNDS, TRAINING_TARGETS } from '../config/gameplay';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { TrainingTarget } from '../entities/TrainingTarget';
import { InputController } from '../input/InputController';
import { BowWeapon } from '../weapons/BowWeapon';
import { BOW_CONFIG } from '../weapons/weaponConfig';

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private controls?: InputController;
  private weapon?: BowWeapon;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private targets?: Phaser.Physics.Arcade.Group;
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
    this.targets = this.physics.add.group({ allowGravity: false, immovable: true });
    this.weapon = new BowWeapon(this, this.player, this.projectiles);
    this.spawnTargets();
    this.physics.add.overlap(
      this.projectiles,
      this.targets,
      this.handleProjectileHit,
      undefined,
      this,
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  public override update(): void {
    if (!this.player || !this.controls || !this.weapon || !this.projectiles) {
      return;
    }

    this.player.move(this.controls.getMovement());
    const aim = this.controls.getAim(this.player.x, this.player.y);
    this.player.face(aim);
    this.weapon.update(this.time.now, this.controls.isShooting(), aim);

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
      .text(372, 28, 'KAMER 1', {
        color: '#7dd3fc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
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
      .text(195, 56, `${BOW_CONFIG.name} · LV.${BOW_CONFIG.upgradeLevel}`, {
        color: '#fbbf24',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private spawnTargets(): void {
    if (!this.targets) {
      return;
    }

    for (const target of TRAINING_TARGETS) {
      const trainingTarget = new TrainingTarget(this, target.id, target.x, target.y);
      this.targets.add(trainingTarget);
    }
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
    if (!(projectileObject instanceof Projectile) || !(targetObject instanceof TrainingTarget)) {
      return;
    }

    if (!projectileObject.registerHit(targetObject.targetId)) {
      return;
    }

    const result = this.damageSystem.apply(targetObject, projectileObject.attack);
    this.showDamageNumber(targetObject.x, targetObject.y, result);

    if (result.defeated) {
      const { targetId, x, y } = targetObject;
      targetObject.playDefeat(() => {
        this.time.delayedCall(900, () => {
          if (this.targets) {
            this.targets.add(new TrainingTarget(this, targetId, x, y));
          }
        });
      });
    } else {
      targetObject.showHit();
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

  private shutdown(): void {
    this.controls?.destroy();
    this.projectiles?.clear(true, true);
    this.targets?.clear(true, true);
    this.controls = undefined;
    this.weapon = undefined;
    this.projectiles = undefined;
    this.targets = undefined;
    this.player = undefined;
  }
}

import Phaser from 'phaser';
import { AbilityController } from '../abilities/AbilityController';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { addAndLaunch } from '../combat/launchProjectile';
import { GAME_SCENE_KEY, GAME_TITLE, GAME_OVER_SCENE_KEY } from '../config/constants';
import { ARENA_BOUNDS } from '../config/gameplay';
import { EnemySpawner } from '../enemies/EnemySpawner';
import { getBossName } from '../enemies/enemyConfig';
import { AdvancedEnemy, type BulletPattern } from '../enemies/AdvancedEnemy';
import { EnemyProjectile } from '../enemies/EnemyProjectile';
import { withinRadius } from '../enemies/enemyMovement';
import { shotAngles } from '../enemies/projectilePatterns';
import {
  ENEMY_DEFEATED_EVENT,
  ENEMY_SPAWNED_EVENT,
  Slime,
} from '../enemies/Slime';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { InputController } from '../input/InputController';
import {
  CHAPTER_ROOM_COUNT,
  getRoomDefinition,
  type RoomDefinition,
} from '../rooms/roomConfig';
import { RoomProgress } from '../rooms/RoomProgress';
import { WeaponController } from '../weapons/WeaponController';
import { WEAPONS } from '../weapons/weaponConfig';
import { progressStore } from '../progression/ProgressStore';
import { permanentBonuses } from '../progression/economy';
import { RunLedger } from '../progression/RunLedger';
import { RunUpgradeDeck, type RunUpgradeId } from '../progression/runUpgrades';
import { findChainTargets } from '../weapons/chainLightning';

type ArcadeCollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

const DOOR_X = ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2;
const DOOR_Y = ARENA_BOUNDS.y + 16;

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private controls?: InputController;
  private weapon?: WeaponController;
  private abilities?: AbilityController;
  private goldHudText?: Phaser.GameObjects.Text;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private enemies?: Phaser.Physics.Arcade.Group;
  private enemyProjectiles?: Phaser.Physics.Arcade.Group;
  private activeBoss?: AdvancedEnemy;
  private bossHealthBar?: Phaser.GameObjects.Graphics;
  private bossNameText?: Phaser.GameObjects.Text;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private enemySpawner?: EnemySpawner;
  private door?: Phaser.GameObjects.Rectangle;
  private healthBar?: Phaser.GameObjects.Graphics;
  private healthText?: Phaser.GameObjects.Text;
  private enemyCountText?: Phaser.GameObjects.Text;
  private roomNumberText?: Phaser.GameObjects.Text;
  private roomTypeText?: Phaser.GameObjects.Text;
  private doorStatusText?: Phaser.GameObjects.Text;
  private aliveEnemies = 0;
  private gameOver = false;
  private transitioning = false;
  private chapterComplete = false;
  private choosingUpgrade = false;
  private upgradeOverlay?: Phaser.GameObjects.Container;
  private run = new RunLedger();
  private upgrades = new RunUpgradeDeck();
  private readonly damageSystem = new DamageSystem();
  private readonly roomProgress = new RoomProgress(CHAPTER_ROOM_COUNT);

  public constructor() {
    super(GAME_SCENE_KEY);
  }

  public create(): void {
    this.roomProgress.reset();
    this.aliveEnemies = 0;
    this.gameOver = false;
    this.transitioning = false;
    this.chapterComplete = false;
    this.choosingUpgrade = false;
    this.run = new RunLedger();
    this.upgrades = new RunUpgradeDeck();
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

    const firstRoom = getRoomDefinition(1);
    const profile = progressStore.current;
    this.player = new Player(
      this,
      firstRoom.layout.playerSpawn.x,
      firstRoom.layout.playerSpawn.y,
      profile.selectedHero,
      profile.heroLevels[profile.selectedHero],
      permanentBonuses(profile.permanentLevels),
    );
    this.controls = new InputController(this);
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false, collideWorldBounds: true });
    this.enemyProjectiles = this.physics.add.group({ allowGravity: false });
    this.obstacles = this.physics.add.staticGroup();
    this.weapon = new WeaponController(
      this, this.player, this.projectiles,
      profile.selectedWeapon, profile.weaponLevels[profile.selectedWeapon],
      permanentBonuses(profile.permanentLevels).weaponDamage,
      permanentBonuses(profile.permanentLevels).weaponSpeed,
    );
    this.enemySpawner = new EnemySpawner(this, this.enemies);

    this.events.on(ENEMY_SPAWNED_EVENT, this.handleEnemySpawned);
    this.events.on(ENEMY_DEFEATED_EVENT, this.handleEnemyDefeated);
    this.createDoor();
    this.createCollisions();
    this.loadRoom(firstRoom, false);
    this.drawPlayerHealth();
    this.abilities = new AbilityController(
      this, this.player, this.enemies, this.controls, this.damageSystem,
      (x, y, result) => this.showDamageNumber(x, y, result),
      () => this.gameOver || this.transitioning || this.chapterComplete || this.choosingUpgrade,
    );

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

    if (this.gameOver || this.transitioning || this.chapterComplete || this.choosingUpgrade) {
      this.player.setVelocity(0, 0);
      return;
    }

    this.player.move(this.controls.getMovement());
    const aim = this.controls.getAim(this.player.x, this.player.y);
    this.player.face(aim);
    this.abilities?.update(this.time.now);
    this.weapon.update(this.time.now, this.controls.isShooting(), aim);

    for (const child of this.enemies.getChildren()) {
      if (child instanceof AdvancedEnemy) {
        child.updateAI(this.player.x, this.player.y, this.time.now,
          this.fireEnemyProjectiles, this.explodeEnemy);
      } else if (child instanceof Slime) {
        child.chase(this.player.x, this.player.y);
      }
    }
    for (const child of this.enemyProjectiles?.getChildren() ?? []) {
      if (child instanceof EnemyProjectile && child.isOutsideArena()) child.destroy();
    }
    this.updateBossHud();

    for (const child of this.projectiles.getChildren()) {
      if (child instanceof Projectile && child.isOutsideArena()) {
        child.destroy();
      }
    }

    if (
      this.roomProgress.doorOpen &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, DOOR_X, DOOR_Y) < 38
    ) {
      this.enterOpenDoor();
    }
  }

  private drawBackdrop(): void {
    this.cameras.main.setBackgroundColor('#08111f');

    this.add
      .text(18, 17, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
      })
      .setDepth(10);

    this.roomNumberText = this.add
      .text(372, 14, 'KAMER 1/20', {
        color: '#7dd3fc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.roomTypeText = this.add
      .text(372, 34, '', {
        color: '#f59e0b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.enemyCountText = this.add
      .text(372, 51, 'VIJANDEN 0', {
        color: '#bef264',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
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
      .text(107, 660, 'BESTURING: zie opties in menu', {
        color: '#64748b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
      })
      .setOrigin(0.5)
      .setDepth(10);

    const profile = progressStore.current;
    this.add
      .text(195, 62, `${WEAPONS[profile.selectedWeapon].name} · LV.${profile.weaponLevels[profile.selectedWeapon]}`, {
        color: '#fbbf24',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.goldHudText = this.add.text(107, 692, '', {
      color: '#fbbf24', fontFamily: 'system-ui, sans-serif',
      fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    this.updateGoldHud();
    this.bossHealthBar = this.add.graphics().setDepth(41).setVisible(false);
    this.bossNameText = this.add.text(195, 137, '', {
      color: '#fde68a', fontFamily: 'system-ui, sans-serif',
      fontSize: '13px', fontStyle: 'bold', stroke: '#020617', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(42).setVisible(false);
  }

  private createDoor(): void {
    if (!this.player) {
      return;
    }

    this.door = this.add
      .rectangle(DOOR_X, DOOR_Y, 72, 22, 0x7f1d1d)
      .setStrokeStyle(3, 0xfca5a5)
      .setDepth(8);
    this.physics.add.existing(this.door, true);
    this.physics.add.collider(this.player, this.door);

    this.doorStatusText = this.add
      .text(DOOR_X, DOOR_Y + 18, 'VERSLA ALLE VIJANDEN', {
        color: '#fca5a5',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(9);
  }

  private createCollisions(): void {
    if (!this.player || !this.projectiles || !this.enemies || !this.obstacles) {
      return;
    }

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.handleProjectileHit,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerContact,
      undefined,
      this,
    );
    if (this.enemyProjectiles) {
      this.physics.add.overlap(
        this.player, this.enemyProjectiles, this.handleEnemyBulletHit, undefined, this,
      );
      this.physics.add.collider(
        this.enemyProjectiles, this.obstacles, this.handleEnemyBulletObstacle, undefined, this,
      );
    }
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.collider(
      this.projectiles,
      this.obstacles,
      this.handleProjectileObstacle,
      undefined,
      this,
    );
  }

  private loadRoom(room: RoomDefinition, showBanner: boolean): void {
    if (
      !this.player ||
      !this.enemies ||
      !this.projectiles ||
      !this.obstacles ||
      !this.enemySpawner
    ) {
      return;
    }

    this.abilities?.cancelMotion();
    this.activeBoss = undefined;
    this.enemyProjectiles?.clear(true, true);
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.obstacles.clear(true, true);
    this.aliveEnemies = 0;
    this.roomProgress.startRoom(room.enemyCount);
    this.run.enterRoom(room.number);
    this.closeDoor();
    this.createObstacles(room);

    const playerBody = this.player.body;
    this.player.setPosition(room.layout.playerSpawn.x, room.layout.playerSpawn.y);
    this.player.setVelocity(0, 0);
    if (playerBody instanceof Phaser.Physics.Arcade.Body) {
      playerBody.reset(room.layout.playerSpawn.x, room.layout.playerSpawn.y);
    }

    const spawned = this.enemySpawner.spawnRoom(room);
    this.activeBoss = spawned.find(
      (enemy): enemy is AdvancedEnemy => enemy instanceof AdvancedEnemy && enemy.isBoss,
    );
    this.updateRoomHud(room);
    this.updateBossHud();
    this.updateEnemyCount();

    if (showBanner) {
      this.showRoomBanner(room);
    }
  }

  private createObstacles(room: RoomDefinition): void {
    if (!this.obstacles) {
      return;
    }

    for (const definition of room.layout.obstacles) {
      const obstacle = this.add
        .rectangle(
          definition.x,
          definition.y,
          definition.width,
          definition.height,
          0x27364b,
        )
        .setStrokeStyle(3, 0x475569)
        .setDepth(6);
      this.physics.add.existing(obstacle, true);
      this.obstacles.add(obstacle);
    }
  }

  private closeDoor(): void {
    if (!this.door) {
      return;
    }

    this.door.setFillStyle(0x7f1d1d).setStrokeStyle(3, 0xfca5a5);
    this.doorStatusText?.setText('VERSLA ALLE VIJANDEN').setColor('#fca5a5');
    const body = this.door.body;
    if (body instanceof Phaser.Physics.Arcade.StaticBody) {
      body.enable = true;
      body.updateFromGameObject();
    }
  }

  private openDoor(): void {
    if (!this.door) {
      return;
    }

    this.door.setFillStyle(0x166534).setStrokeStyle(3, 0x86efac);
    this.doorStatusText?.setText('DEUR OPEN ↑').setColor('#86efac');
    const body = this.door.body;
    if (body instanceof Phaser.Physics.Arcade.StaticBody) {
      body.enable = false;
    }
  }

  private enterOpenDoor(): void {
    if (this.transitioning || !this.roomProgress.doorOpen || !this.player) {
      return;
    }

    this.transitioning = true;
    this.player.setVelocity(0, 0);

    if (this.roomProgress.chapterComplete) {
      this.finishChapterRooms();
      return;
    }

    const nextRoomNumber = this.roomProgress.advance();
    if (nextRoomNumber === null) {
      this.transitioning = false;
      return;
    }

    this.cameras.main.fadeOut(180, 2, 6, 23);
    this.time.delayedCall(190, () => {
      this.loadRoom(getRoomDefinition(nextRoomNumber), true);
      this.cameras.main.fadeIn(180, 2, 6, 23);
      this.transitioning = false;
    });
  }

  private showRoomBanner(room: RoomDefinition): void {
    const banner = this.add
      .text(
        195,
        350,
        room.isBossRoom ? `BOSS: ${getBossName(room.number)}` : `KAMER ${room.number}`,
        {
          color: room.isBossRoom ? '#fbbf24' : '#bae6fd',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          stroke: '#020617',
          strokeThickness: 6,
        },
      )
      .setOrigin(0.5)
      .setDepth(60);

    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: 325,
      delay: 450,
      duration: 350,
      onComplete: () => banner.destroy(),
    });
  }

  private updateRoomHud(room: RoomDefinition): void {
    this.roomNumberText?.setText(`KAMER ${room.number}/${CHAPTER_ROOM_COUNT}`);
    this.roomTypeText?.setText(room.isBossRoom ? 'BOSS FIGHT' : room.layout.id.toUpperCase());
  }

  private readonly handleProjectileHit = (
    projectileObject: ArcadeCollisionObject,
    targetObject: ArcadeCollisionObject,
  ): void => {
    if (!(projectileObject instanceof Projectile) || !(targetObject instanceof Slime) ||
      targetObject.aiState === 'defeated') {
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
    if (projectileObject.effect === 'chain-lightning') {
      this.applyChainLightning(targetObject, projectileObject.attack);
    }
  };

  private applyChainLightning(primary: Slime, attack: Readonly<Projectile['attack']>): void {
    if (!this.enemies) return;
    const candidates = this.enemies.getChildren()
      .filter((child): child is Slime => child instanceof Slime && child.aiState !== 'defeated')
      .map(enemy => ({ enemyId: enemy.enemyId, x: enemy.x, y: enemy.y }));
    const jumps = findChainTargets(primary, candidates);
    let fromX = primary.x;
    let fromY = primary.y;
    for (const target of jumps) {
      const enemy = this.enemies.getChildren()
        .find((child): child is Slime => child instanceof Slime && child.enemyId === target.enemyId);
      if (!enemy || enemy.aiState === 'defeated') continue;
      const reduced = { ...attack, damage: attack.damage * 0.55, criticalChance: 0 };
      const result = this.damageSystem.apply(enemy, reduced);
      this.showDamageNumber(enemy.x, enemy.y, result);
      const bolt = this.add.graphics().setDepth(26);
      bolt.lineStyle(3, 0x67e8f9, 1);
      bolt.lineBetween(fromX, fromY, enemy.x, enemy.y);
      this.tweens.add({ targets: bolt, alpha: 0, duration: 170,
        onComplete: () => bolt.destroy() });
      if (result.defeated) enemy.playDefeat();
      else enemy.showHit();
      fromX = enemy.x;
      fromY = enemy.y;
    }
  }

  private readonly fireEnemyProjectiles = (enemy: AdvancedEnemy, pattern: BulletPattern): void => {
    if (!this.player || !this.enemyProjectiles || this.gameOver || this.transitioning) return;
    const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    const angles = shotAngles(pattern, angle);
    const speed = enemy.kind === 'boss' ? 260 : enemy.kind === 'mage' ? 220 : 320;
    const color = enemy.kind === 'mage' ? 0xa78bfa : enemy.kind === 'boss' ? 0xf59e0b : 0xfb7185;
    for (const direction of angles) {
      const bullet = new EnemyProjectile(
        this, enemy.x + Math.cos(direction) * 30,
        enemy.y + Math.sin(direction) * 30,
        Math.cos(direction), Math.sin(direction),
        speed, enemy.stats.damage, color,
      );
      addAndLaunch(bullet, () => this.enemyProjectiles!.add(bullet),
        { x: Math.cos(direction), y: Math.sin(direction) }, speed);
    }
  };

  private readonly explodeEnemy = (enemy: AdvancedEnemy, radius: number): void => {
    const ring = this.add.circle(enemy.x, enemy.y, radius, 0xf97316, 0.3)
      .setStrokeStyle(4, 0xfbbf24).setDepth(28);
    this.tweens.add({
      targets: ring, alpha: 0, duration: 210, onComplete: () => ring.destroy(),
    });
    if (!this.player || this.gameOver || !withinRadius(
      enemy.x, enemy.y, this.player.x, this.player.y, radius,
    )) return;
    this.damagePlayer(enemy.contactAttack);
  };

  private readonly handleEnemyBulletHit = (
    playerObject: ArcadeCollisionObject,
    bulletObject: ArcadeCollisionObject,
  ): void => {
    if (!(playerObject instanceof Player) || !(bulletObject instanceof EnemyProjectile)) return;
    // Destroy on first overlap, even during i-frames: no late/double contact.
    const attack = bulletObject.attack;
    bulletObject.destroy();
    this.damagePlayer(attack);
  };

  private readonly handleEnemyBulletObstacle = (
    projectileObject: ArcadeCollisionObject,
  ): void => {
    if (projectileObject instanceof EnemyProjectile) projectileObject.destroy();
  };

  private readonly handleProjectileObstacle = (
    projectileObject: ArcadeCollisionObject,
  ): void => {
    if (projectileObject instanceof Projectile) {
      projectileObject.destroy();
    }
  };

  private readonly handlePlayerContact = (
    playerObject: ArcadeCollisionObject,
    enemyObject: ArcadeCollisionObject,
  ): void => {
    if (!(playerObject instanceof Player) || !(enemyObject instanceof Slime)) {
      return;
    }

    if (enemyObject.aiState === 'defeated') return;
    this.damagePlayer(enemyObject.contactAttack, enemyObject.attackIntervalMs);
  };

  private damagePlayer(attack: Readonly<Projectile['attack']>, iframeMs = 650): void {
    if (!this.player || this.gameOver || !this.player.canReceiveContactDamage(this.time.now)) return;
    const result = this.damageSystem.apply(this.player, attack);
    this.player.beginInvulnerability(this.time.now, iframeMs);
    this.drawPlayerHealth();
    if (result.defeated) this.endRun();
    else this.showPlayerHit();
  }

  private updateBossHud(): void {
    if (!this.bossHealthBar || !this.bossNameText) return;
    const boss = this.activeBoss;
    const visible = !!boss && boss.active && boss.aiState !== 'defeated';
    this.bossHealthBar.setVisible(visible);
    this.bossNameText.setVisible(visible);
    this.bossHealthBar.clear();
    if (!visible || !boss) return;
    this.bossNameText.setText(getBossName(this.roomProgress.roomNumber) +
      (boss.healthRatio <= 0.5 ? ' · FASE 2' : ' · FASE 1'));
    this.bossHealthBar.fillStyle(0x020617, 0.95);
    this.bossHealthBar.fillRoundedRect(60, 154, 270, 14, 4);
    this.bossHealthBar.fillStyle(boss.healthRatio <= 0.5 ? 0xef4444 : 0xf59e0b);
    this.bossHealthBar.fillRoundedRect(62, 156, 266 * boss.healthRatio, 10, 3);
  }

  private readonly handleEnemySpawned = (): void => {
    this.aliveEnemies += 1;
    this.updateEnemyCount();
  };

  private readonly handleEnemyDefeated = (enemy: Slime): void => {
    if (this.gameOver || !this.run.defeatEnemy(
      enemy.enemyId, enemy instanceof AdvancedEnemy ? enemy.kind : 'slime',
    )) return;
    this.aliveEnemies = Math.max(0, this.aliveEnemies - 1);
    this.updateEnemyCount();
    if (this.roomProgress.registerEnemyDefeated()) {
      // All scheduled enemies are dead; residual bullets must not harm the player.
      this.enemyProjectiles?.clear(true, true);
      this.run.clearRoom(this.roomProgress.roomNumber);
      this.openDoor();
      if (this.roomProgress.roomNumber < CHAPTER_ROOM_COUNT &&
        [2, 4, 7, 10, 13, 16, 19].includes(this.roomProgress.roomNumber)) {
        this.showUpgradeOffer();
      }
    }
    this.updateGoldHud();
  };

  private showDamageNumber(x: number, y: number, result: DamageResult): void {
    this.run.recordDamage(result.amount);
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
    this.enemyCountText?.setText(`VIJANDEN ${this.aliveEnemies}`);
  }

  private updateGoldHud(): void {
    this.goldHudText?.setText(`RUN: +${this.run.runGold} G`);
  }

  /** Offers three exclusive run-only improvements after selected cleared rooms. */
  private showUpgradeOffer(): void {
    if (!this.player || this.choosingUpgrade) return;
    const cards = this.upgrades.offer(this.player.currentHp < this.player.maxHp);
    if (cards.length < 3) return;
    this.choosingUpgrade = true;
    this.player.setVelocity(0, 0);
    this.controls?.cancelTouches();
    this.physics.world.pause();
    const overlay = this.add.container(0, 0).setDepth(170);
    this.upgradeOverlay = overlay;
    const shade = this.add.rectangle(195, 422, 390, 844, 0x020617, 0.93)
      .setInteractive();
    overlay.add(shade);
    overlay.add(this.add.text(195, 171, 'KIES EEN RUN-UPGRADE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '23px',
      fontStyle: 'bold', color: '#fde68a',
    }).setOrigin(0.5));
    overlay.add(this.add.text(195, 212, 'Geldig tot het einde van deze run', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cbd5e1',
    }).setOrigin(0.5));

    cards.forEach((card, index) => {
      const y = 299 + index * 112;
      const border = card.rarity === 'epic' ? 0xc084fc :
        card.rarity === 'rare' ? 0x38bdf8 : 0x94a3b8;
      const plate = this.add.rectangle(195, y, 330, 99, 0x172338)
        .setStrokeStyle(2, border).setInteractive({ useHandCursor: true });
      plate.on('pointerdown', () => this.chooseUpgrade(card.id));
      overlay.add(plate);
      overlay.add(this.add.text(46, y - 32, card.name.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif', fontSize: '17px',
        fontStyle: 'bold', color: '#f8fafc',
      }));
      overlay.add(this.add.text(46, y - 5, card.description, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cbd5e1',
      }));
      overlay.add(this.add.text(46, y + 19,
        card.rarity.toUpperCase() + '   ·   ' + (this.upgrades.count(card.id) + 1) + '/' + card.maxStacks, {
        fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#94a3b8',
      }));
    });
  }

  private chooseUpgrade(id: RunUpgradeId): void {
    if (!this.choosingUpgrade || !this.player || !this.weapon || !this.upgrades.choose(id)) return;
    if (id === 'projectile') this.weapon.extraProjectiles += 1;
    else if (id === 'piercing') this.weapon.extraPiercing += 1;
    else this.player.applyRunBonus(id);
    this.upgradeOverlay?.destroy(true);
    this.upgradeOverlay = undefined;
    this.choosingUpgrade = false;
    this.physics.world.resume();
    this.drawPlayerHealth();
  }

  private completeRun(victory: boolean): void {
    if (this.gameOver || this.chapterComplete) return;
    if (victory) this.chapterComplete = true;
    else this.gameOver = true;
    this.abilities?.cancelMotion();
    this.enemyProjectiles?.clear(true, true);
    this.player?.setVelocity(0, 0);
    this.upgradeOverlay?.destroy(true);
    this.upgradeOverlay = undefined;
    this.choosingUpgrade = false;
    this.physics.world.resume();
    const report = this.run.report(victory);
    progressStore.dispatch({ type: 'settleRun', report });
    this.scene.start(GAME_OVER_SCENE_KEY, {
      report, chosenUpgrades: this.upgrades.chosen(),
    });
  }

  private finishChapterRooms(): void { this.completeRun(true); }

  private endRun(): void { this.completeRun(false); }

  private shutdown(): void {
    this.physics.world.resume();
    this.upgradeOverlay?.destroy(true);
    this.upgradeOverlay = undefined;
    this.abilities?.destroy();
    this.abilities = undefined;
    this.controls?.destroy();
    this.projectiles?.clear(true, true);
    this.enemies?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);
    this.obstacles?.clear(true, true);
    this.events.off(ENEMY_SPAWNED_EVENT, this.handleEnemySpawned);
    this.events.off(ENEMY_DEFEATED_EVENT, this.handleEnemyDefeated);
    this.controls = undefined;
    this.weapon = undefined;
    this.projectiles = undefined;
    this.enemies = undefined;
    this.enemyProjectiles = undefined;
    this.activeBoss = undefined;
    this.bossHealthBar = undefined;
    this.bossNameText = undefined;
    this.obstacles = undefined;
    this.enemySpawner = undefined;
    this.door = undefined;
    this.healthBar = undefined;
    this.goldHudText = undefined;
    this.healthText = undefined;
    this.enemyCountText = undefined;
    this.roomNumberText = undefined;
    this.roomTypeText = undefined;
    this.doorStatusText = undefined;
    this.player = undefined;
  }
}

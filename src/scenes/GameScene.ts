import Phaser from 'phaser';
import { AbilityController } from '../abilities/AbilityController';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { shouldParryHit } from '../combat/parry';
import { addAndLaunch } from '../combat/launchProjectile';
import { GAME_SCENE_KEY, GAME_TITLE, GAME_OVER_SCENE_KEY, GAME_WIDTH } from '../config/constants';
import { EnemySpawner } from '../enemies/EnemySpawner';
import { getSlimeStatsForRoom } from '../enemies/enemyConfig';
import { getWorldCharacter } from '../enemies/worldCharacters';
import { getBossProfile, getBossTier } from '../enemies/bossProfiles';
import { SPORE_POISON, poisonActive, poisonCovers, poisonTickDue } from '../enemies/poisonHazard';
import { AdvancedEnemy, type BulletPattern } from '../enemies/AdvancedEnemy';
import { EnemyProjectile } from '../enemies/EnemyProjectile';
import { HomingEnemyProjectile } from '../enemies/HomingEnemyProjectile';
import { coverIsClose, firstShieldOnPath, type ShieldPoint } from '../enemies/treantShield';
import { ICE_WALL, HOMING_ORB, wallGapCenter, wallHitsCircle, wallXAt } from '../enemies/frozenBossAttacks';
import { withinRadius } from '../enemies/enemyMovement';
import { shotAngles } from '../enemies/projectilePatterns';
import {
  ENEMY_DEFEATED_EVENT,
  ENEMY_SPAWNED_EVENT,
  Slime,
} from '../enemies/Slime';
import { Player } from '../entities/Player';
import { CoinPickup } from '../entities/CoinPickup';
import { Projectile } from '../entities/Projectile';
import { InputController } from '../input/InputController';
import {
  CHAPTER_ROOM_COUNT,
  getRoomDefinition,
  type RoomDefinition,
} from '../rooms/roomConfig';
import { RoomProgress } from '../rooms/RoomProgress';
import { chooseDistantSpawnIndices, spawnWaveSettings, type SpawnWaveSettings } from '../rooms/spawnWaves';
import { targetArenaScroll } from '../rooms/cameraFollow';
import { WeaponController } from '../weapons/WeaponController';
import { WEAPONS } from '../weapons/weaponConfig';
import { progressStore } from '../progression/ProgressStore';
import { permanentBonuses } from '../progression/economy';
import { RunLedger } from '../progression/RunLedger';
import { coinDropsForEnemy } from '../progression/coinRewards';
import { roomClearHealing } from '../progression/roomHealing';
import { RunUpgradeDeck, type RunUpgradeId } from '../progression/runUpgrades';
import { getWorld, getWorldBossName, type WorldId } from '../worlds/worldConfig';
import { findChainTargets } from '../weapons/chainLightning';
import { upgradeCardBounds } from '../ui/upgradeLayout';

type ArcadeCollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private controls?: InputController;
  private weapon?: WeaponController;
  private abilities?: AbilityController;
  private goldHudText?: Phaser.GameObjects.Text;
  private readonly coins = new Set<CoinPickup>();
  private projectiles?: Phaser.Physics.Arcade.Group;
  private enemies?: Phaser.Physics.Arcade.Group;
  private enemyProjectiles?: Phaser.Physics.Arcade.Group;
  private readonly bombTimers = new Set<Phaser.Time.TimerEvent>();
  private readonly bombWarnings = new Set<Phaser.GameObjects.Arc>();
  private readonly frozenWalls = new Set<{
    warning: Phaser.GameObjects.Graphics; ice: Phaser.GameObjects.Graphics;
    bounds: { x: number; y: number; width: number; height: number };
    gapY: number; warnAt: number; launchAt: number; hit: boolean;
    damage: number; owner: AdvancedEnemy;
  }>();
  private readonly poisonBottles = new Set<Phaser.GameObjects.Container>();
  private readonly poisonPools = new Set<{
    circle: Phaser.GameObjects.Arc; x: number; y: number;
    radius: number; startAt: number; nextTickAt: number; damage: number;
  }>();
  private activeBosses: AdvancedEnemy[] = [];
  private readonly bossHealthBars: Phaser.GameObjects.Graphics[] = [];
  private readonly bossNameTexts: Phaser.GameObjects.Text[] = [];
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private enemySpawner?: EnemySpawner;
  private door?: Phaser.GameObjects.Rectangle;
  private arenaArt?: Phaser.GameObjects.Container;
  private currentRoom?: RoomDefinition;
  private healthBar?: Phaser.GameObjects.Graphics;
  private healthText?: Phaser.GameObjects.Text;
  private enemyCountText?: Phaser.GameObjects.Text;
  private roomNumberText?: Phaser.GameObjects.Text;
  private roomTypeText?: Phaser.GameObjects.Text;
  private doorStatusText?: Phaser.GameObjects.Text;
  private doorHintText?: Phaser.GameObjects.Text;
  private aliveEnemies = 0;
  private pendingSpawnIndices: number[] = [];
  private nextEnemyWaveAt = 0;
  private waveSettings?: SpawnWaveSettings;
  private gameOver = false;
  private transitioning = false;
  private chapterComplete = false;
  private choosingUpgrade = false;
  private upgradeOverlay?: Phaser.GameObjects.Container;
  private upgradeHitAreas: Phaser.GameObjects.Zone[] = [];
  private worldId: WorldId = 1;
  private run = new RunLedger();
  private upgradeReady = false;
  private upgrades = new RunUpgradeDeck();
  private readonly damageSystem = new DamageSystem();
  private readonly roomProgress = new RoomProgress(CHAPTER_ROOM_COUNT);

  public constructor() {
    super(GAME_SCENE_KEY);
  }

  public create(): void {
    this.worldId = progressStore.current.selectedWorld;
    this.roomProgress.reset();
    this.clearCoins();
    this.aliveEnemies = 0;
    this.gameOver = false;
    this.transitioning = false;
    this.chapterComplete = false;
    this.choosingUpgrade = false;
    this.run = new RunLedger(undefined, this.worldId);
    this.upgrades = new RunUpgradeDeck();
    this.drawBackdrop();

    const firstRoom = getRoomDefinition(1, this.worldId);
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
      this.enemies,
      this.handleMeleeHit,
    );
    this.enemySpawner = new EnemySpawner(this, this.enemies);

    this.events.on(ENEMY_SPAWNED_EVENT, this.handleEnemySpawned);
    this.events.on(ENEMY_DEFEATED_EVENT, this.handleEnemyDefeated);
    this.createDoor();
    this.createCollisions();
    this.loadRoom(firstRoom, false);
    this.drawPlayerHealth();
    this.abilities = new AbilityController(
      this, this.player, profile.heroLevels[profile.selectedHero], profile.abilityLevels,
      this.enemies, this.controls, this.damageSystem,
      (x, y, result) => this.showDamageNumber(x, y, result),
      () => this.drawPlayerHealth(),
      () => this.gameOver || this.transitioning || this.chapterComplete || this.choosingUpgrade,
      this.enemyProjectiles,
      () => this.currentRoom?.layout,
      (origin, target) => this.findProtectingTreant(origin, target),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  public override update(_time: number, delta: number): void {
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
    this.collectNearbyCoins(delta);
    // All room enemies are spawned up front, leaving no reinforcement indices.
    this.updateEnemyWaves();
    this.updateCamera();
    const aim = this.controls.getAim(this.player.x, this.player.y);
    this.player.face(aim);
    this.abilities?.update(this.time.now, delta);
    this.updatePoisonPools(this.time.now);
    this.updateFrozenWalls(this.time.now);
    this.weapon.update(this.time.now, this.controls.isShooting(), aim);

    // Ranged world-1 mobs use nearby Ancient Treants as moving cover.
    const treants = this.liveTreantShields();
    for (const child of this.enemies.getChildren()) {
      if (child instanceof AdvancedEnemy) {
        const nearestCover = this.worldId === 1 && (child.kind === 'archer' || child.kind === 'mage')
          ? treants.filter(tank => coverIsClose(child, tank))
              .sort((a, b) => Phaser.Math.Distance.Between(child.x, child.y, a.x, a.y) -
                Phaser.Math.Distance.Between(child.x, child.y, b.x, b.y))[0]
          : undefined;
        child.updateAI(this.player.x, this.player.y, this.time.now,
          this.fireEnemyProjectiles, this.explodeEnemy, this.dropBossBombs,
          nearestCover?.shieldSurface, this.summonFrozenMinions);
      } else if (child instanceof Slime) {
        child.chase(this.player.x, this.player.y);
      }
    }
    for (const child of this.enemyProjectiles?.getChildren() ?? []) {
      if (child instanceof EnemyProjectile) {
        if (child instanceof HomingEnemyProjectile) {
          child.updateHoming(this.time.now, delta, this.player);
        }
        if (!child.active) continue;
        child.setSlowMotion(this.abilities?.enemyProjectileFactor(this.time.now) ?? 1);
        if (child.isOutsideArena()) child.destroy();
      }
    }
    this.updateBossHud();

    for (const child of this.projectiles.getChildren()) {
      if (!(child instanceof Projectile) || !child.active) continue;
      const flight = child.consumeFlightSegment();
      const blocker = this.findProtectingTreant(flight.from, flight.to);
      if (blocker) {
        this.hitTreantShield(child, blocker);
      } else if (child.isOutsideArena()) {
        child.destroy();
      }
    }

    if (
      this.roomProgress.doorOpen &&
      this.door && Phaser.Math.Distance.Between(this.player.x, this.player.y,
        this.door.x, this.door.y) < 38
    ) {
      this.enterOpenDoor();
    }
  }

  private drawBackdrop(): void {
    this.cameras.main.setBackgroundColor('#' + getWorld(this.worldId).wall.toString(16).padStart(6, '0'));

    this.add
      .text(18, 17, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
      })
      .setDepth(10).setScrollFactor(0);

    this.roomNumberText = this.add
      .text(GAME_WIDTH - 18, 14, 'KAMER 1/' + CHAPTER_ROOM_COUNT, {
        color: '#7dd3fc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10).setScrollFactor(0);

    this.roomTypeText = this.add
      .text(GAME_WIDTH - 18, 34, '', {
        color: '#f59e0b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10).setScrollFactor(0);

    this.enemyCountText = this.add
      .text(GAME_WIDTH - 18, 51, 'VIJANDEN 0', {
        color: '#bef264',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10).setScrollFactor(0);

    this.add
      .text(107, 660, 'BESTURING: zie opties in menu', {
        color: '#64748b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
      })
      .setOrigin(0.5)
      .setDepth(10).setScrollFactor(0);

    const profile = progressStore.current;
    this.add
      .text(GAME_WIDTH / 2, 62, `${WEAPONS[profile.selectedWeapon].name} · LV.${profile.weaponLevels[profile.selectedWeapon]}`, {
        color: '#fbbf24',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10).setScrollFactor(0);

    this.goldHudText = this.add.text(107, 692, '', {
      color: '#fbbf24', fontFamily: 'system-ui, sans-serif',
      fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setScrollFactor(0);
    this.updateGoldHud();
    this.doorHintText = this.add.text(GAME_WIDTH / 2, 100, 'DEUR OPEN ↑  ·  GA NAAR HET NOORDEN', {
      color: '#86efac', fontFamily: 'system-ui, sans-serif',
      fontSize: '11px', fontStyle: 'bold', stroke: '#020617', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(43).setScrollFactor(0).setVisible(false);
    // Two dedicated HUD slots: the room-15 double encounter never overlaps.
    for (let slot = 0; slot < 2; slot++) {
      const y = 135 + slot * 44;
      this.bossHealthBars.push(this.add.graphics().setDepth(41)
        .setScrollFactor(0).setVisible(false));
      this.bossNameTexts.push(this.add.text(GAME_WIDTH / 2, y, '', {
        color: '#fde68a', fontFamily: 'system-ui, sans-serif',
        fontSize: '12px', fontStyle: 'bold', stroke: '#020617', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(42).setScrollFactor(0).setVisible(false));
    }
  }

  private updateCamera(): void {
    if (!this.player || !this.currentRoom) return;
    const target = targetArenaScroll(this.player.x, this.player.y, this.currentRoom.layout.bounds);
    const camera = this.cameras.main;
    camera.setScroll(Phaser.Math.Linear(camera.scrollX, target.x, 0.16),
      Phaser.Math.Linear(camera.scrollY, target.y, 0.16));
  }

  /** Five distinct floor palettes/motifs with the existing 21 chamber layouts. */
  private drawArena(room: RoomDefinition): void {
    this.arenaArt?.destroy(true);
    const { bounds, accent } = room.layout;
    const world = getWorld(this.worldId);
    const plate = this.add.rectangle(
      bounds.x + bounds.width / 2, bounds.y + bounds.height / 2,
      bounds.width, bounds.height, world.floor,
    ).setStrokeStyle(6, world.accent, 0.7);
    const floor = this.add.graphics();
    floor.lineStyle(1, world.grid, 0.55);
    for (let x = bounds.x + 30; x < bounds.x + bounds.width; x += 30) {
      floor.lineBetween(x, bounds.y, x, bounds.y + bounds.height);
    }
    for (let y = bounds.y + 30; y < bounds.y + bounds.height; y += 30) {
      floor.lineBetween(bounds.x, y, bounds.x + bounds.width, y);
    }
    floor.lineStyle(2, accent, 0.18);
    for (let i = 0; i < 8; i++) {
      const x = bounds.x + 44 + ((i * 157 + room.number * 37) % Math.max(50, bounds.width - 88));
      const y = bounds.y + 48 + ((i * 231 + room.number * 53) % Math.max(55, bounds.height - 110));
      floor.strokeCircle(x, y, 12 + (i % 3) * 9);
      floor.lineBetween(x - 9, y, x + 9, y);
    }
    // World-specific floor motifs give each campaign its own map identity.
    // Cheap static vector graphics: regenerated only when changing chambers.
    const motifs = this.add.graphics();
    motifs.lineStyle(2, world.accent, 0.23);
    for (let i = 0; i < 18; i++) {
      const x = bounds.x + 45 + ((i * 137 + room.number * 43) % Math.max(55, bounds.width - 90));
      const y = bounds.y + 46 + ((i * 241 + room.number * 61) % Math.max(65, bounds.height - 105));
      switch (this.worldId) {
        case 1: // Ferns and winding roots.
          motifs.strokeCircle(x, y, 7 + (i % 3) * 3);
          motifs.lineBetween(x - 12, y + 9, x + 12, y - 9);
          break;
        case 2: // Angular ice crystals and snowflake shards.
          motifs.lineBetween(x, y - 14, x + 11, y);
          motifs.lineBetween(x + 11, y, x, y + 14);
          motifs.lineBetween(x, y + 14, x - 11, y);
          motifs.lineBetween(x - 11, y, x, y - 14);
          motifs.lineBetween(x - 8, y, x + 8, y);
          break;
        case 3: // Broken lava fissures.
          motifs.lineBetween(x - 17, y - 12, x - 3, y - 2);
          motifs.lineBetween(x - 3, y - 2, x - 8, y + 6);
          motifs.lineBetween(x - 8, y + 6, x + 16, y + 12);
          motifs.strokeCircle(x + 16, y - 7, 4);
          break;
        case 4: // Electric bolts.
          motifs.lineBetween(x - 10, y - 16, x + 2, y - 5);
          motifs.lineBetween(x + 2, y - 5, x - 4, y + 4);
          motifs.lineBetween(x - 4, y + 4, x + 11, y + 14);
          break;
        case 5: // Arcane void sigils.
          motifs.strokeCircle(x, y, 15);
          motifs.strokeCircle(x, y, 5);
          motifs.lineBetween(x - 18, y, x + 18, y);
          motifs.lineBetween(x, y - 18, x, y + 18);
          break;
      }
    }
    this.arenaArt = this.add.container(0, 0, [plate, floor, motifs]).setDepth(0);
  }

  private createDoor(): void {
    if (!this.player) {
      return;
    }

    this.door = this.add
      .rectangle(195, 98, 72, 22, 0x7f1d1d)
      .setStrokeStyle(3, 0xfca5a5)
      .setDepth(8);
    this.physics.add.existing(this.door, true);
    this.physics.add.collider(this.player, this.door);

    this.doorStatusText = this.add
      .text(195, 116, 'VERSLA ALLE VIJANDEN', {
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
    this.weapon?.clearGroundEffects();
    this.clearBossBombs();
    this.clearCoins();
    this.activeBosses = [];
    this.enemyProjectiles?.clear(true, true);
    this.enemies.clear(true, true);
    this.projectiles.clear(true, true);
    this.obstacles.clear(true, true);
    this.aliveEnemies = 0;
    this.pendingSpawnIndices = [];
    this.waveSettings = undefined;
    this.currentRoom = room;
    const bounds = room.layout.bounds;
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height,
      true, true, true, true);
    this.cameras.main.setBounds(0, 0, bounds.x + bounds.width + 18,
      bounds.y + bounds.height + 204);
    this.drawArena(room);
    this.roomProgress.startRoom(room.enemyCount);
    // The cooldown clock only advances while enemies are active in a room.
    if (this.roomProgress.doorOpen) this.abilities?.pauseCooldowns(this.time.now);
    else this.abilities?.resumeCooldowns(this.time.now);
    this.run.enterRoom(room.number);
    if (this.door) {
      this.door.setPosition(bounds.x + bounds.width / 2, bounds.y + 16);
      this.doorStatusText?.setPosition(this.door.x, this.door.y + 18);
    }
    this.closeDoor();
    this.createObstacles(room);

    const playerBody = this.player.body;
    this.player.setPosition(room.layout.playerSpawn.x, room.layout.playerSpawn.y);
    this.player.setVelocity(0, 0);
    if (playerBody instanceof Phaser.Physics.Arcade.Body) {
      playerBody.reset(room.layout.playerSpawn.x, room.layout.playerSpawn.y);
    }

    const initial = targetArenaScroll(this.player.x, this.player.y, bounds);
    this.cameras.main.setScroll(initial.x, initial.y);

    this.waveSettings = spawnWaveSettings(room.number, room.enemyCount);
    this.pendingSpawnIndices = room.enemySpawns.map((_, index) => index);
    const spawned = this.spawnEnemyWave(this.waveSettings.initial);
    this.activeBosses = spawned.filter(
      (enemy): enemy is AdvancedEnemy => enemy instanceof AdvancedEnemy && enemy.isBoss,
    ).sort((a, b) => a.bossSlot - b.bossSlot);
    this.updateRoomHud(room);
    this.updateBossHud();
    this.updateEnemyCount();

    if (showBanner) {
      this.showRoomBanner(room);
    }
  }

  /** New enemies arrive over time, far from the current player position. */
  private updateEnemyWaves(): void {
    if (!this.waveSettings || this.pendingSpawnIndices.length === 0) return;
    const capacity = this.waveSettings.maxActive - this.aliveEnemies;
    if (capacity <= 0) return;
    if (this.aliveEnemies > 0 && this.time.now < this.nextEnemyWaveAt &&
        this.aliveEnemies > Math.max(2, Math.floor(this.waveSettings.maxActive / 3))) return;
    this.spawnEnemyWave(Math.min(capacity, this.waveSettings.batchSize));
  }

  private spawnEnemyWave(count: number): readonly Slime[] {
    if (!this.currentRoom || !this.player || !this.enemies || !this.enemySpawner ||
        count <= 0 || this.pendingSpawnIndices.length === 0) return [];
    const live = this.enemies.getChildren()
      .filter((child): child is Slime => child instanceof Slime &&
        child.active && child.aiState !== 'defeated');
    const settings = this.waveSettings!;
    const occupied = live.map(enemy => ({ x: enemy.x, y: enemy.y }));
    // Try not to spawn directly onto another enemy, but never deadlock room
    // completion if the player is standing near the last open spawn positions.
    let chosen = chooseDistantSpawnIndices(
      this.currentRoom.enemySpawns, this.pendingSpawnIndices,
      { x: this.player.x, y: this.player.y }, count,
      settings.preferredDistance, occupied,
    );
    if (!chosen.length) chosen = chooseDistantSpawnIndices(
      this.currentRoom.enemySpawns, this.pendingSpawnIndices,
      { x: this.player.x, y: this.player.y }, count,
      settings.preferredDistance,
    );
    if (!chosen.length) return [];
    const selected = new Set(chosen);
    this.pendingSpawnIndices = this.pendingSpawnIndices.filter(i => !selected.has(i));
    const spawned = this.enemySpawner.spawnRoom(this.currentRoom, chosen, this.worldId);
    this.nextEnemyWaveAt = this.time.now + settings.intervalMs;
    return spawned;
  }

  private createObstacles(room: RoomDefinition): void {
    if (!this.obstacles) {
      return;
    }

    const world = getWorld(this.worldId);
    for (const definition of room.layout.obstacles) {
      const obstacle = this.add
        .rectangle(
          definition.x,
          definition.y,
          definition.width,
          definition.height,
          world.obstacle,
        )
        .setStrokeStyle(3, world.obstacleBorder)
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
    this.doorHintText?.setVisible(false);
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
    this.doorHintText?.setVisible(true);
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
      this.loadRoom(getRoomDefinition(nextRoomNumber, this.worldId), true);
      this.cameras.main.fadeIn(180, 2, 6, 23);
      this.transitioning = false;
    });
  }

  private showRoomBanner(room: RoomDefinition): void {
    const banner = this.add
      .text(
        GAME_WIDTH / 2,
        350,
        room.isBossRoom ? `BOSS: ${room.enemyCount === 2 ? 'DUBBEL GEVECHT' : getWorldBossName(this.worldId, room.number)}` :
          `WERELD ${this.worldId} · KAMER ${room.number}`,
        {
          color: room.isBossRoom ? '#fbbf24' : '#bae6fd',
          fontFamily: 'system-ui, sans-serif',
          fontSize: room.isBossRoom ? '18px' : '24px',
          fontStyle: 'bold',
          stroke: '#020617',
          strokeThickness: 6,
        },
      )
      .setOrigin(0.5)
      .setDepth(60).setScrollFactor(0);

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
    this.roomTypeText?.setText('W' + this.worldId + ' · ' + getWorld(this.worldId).name.toUpperCase() +
      (room.isBossRoom ? ' · BOSS' : ''));
    this.roomTypeText?.setColor('#' + getWorld(this.worldId).accent.toString(16).padStart(6, '0'));
  }

  private liveTreantShields(): AdvancedEnemy[] {
    if (this.worldId !== 1 || !this.enemies) return [];
    return this.enemies.getChildren().filter(
      (enemy): enemy is AdvancedEnemy => enemy instanceof AdvancedEnemy &&
        enemy.isTreantShield && enemy.active && enemy.aiState !== 'defeated',
    );
  }

  /** Match the rendered panel, not the Treant's much smaller body collider. */
  private findProtectingTreant(origin: Readonly<ShieldPoint>,
    target: Readonly<ShieldPoint>): AdvancedEnemy | undefined {
    const panels = this.liveTreantShields().map(tank => ({ ...tank.shieldSurface, tank }));
    return firstShieldOnPath(origin, target, panels)?.tank;
  }

  private hitTreantShield(projectile: Projectile, tank: AdvancedEnemy): void {
    if (!projectile.active || !tank.active || tank.aiState === 'defeated') return;
    // Always consumes the projectile, including piercing projectiles.
    if (!projectile.registerHit(tank.enemyId)) return;
    projectile.destroy();
    const result = this.damageSystem.apply(tank, projectile.attack);
    this.showDamageNumber(tank.x, tank.y, result);
    if (result.defeated) tank.playDefeat();
    else tank.showHit();
  }

  private readonly handleProjectileHit = (
    projectileObject: ArcadeCollisionObject,
    targetObject: ArcadeCollisionObject,
  ): void => {
    if (!(projectileObject instanceof Projectile) || !(targetObject instanceof Slime) ||
      targetObject.aiState === 'defeated') {
      return;
    }
    // The front shield is struck before any enemy standing behind it.
    // This also prevents piercing shots from passing through the wood plate.
    const blocker = this.findProtectingTreant(projectileObject.launchOrigin, targetObject);
    if (blocker) {
      this.hitTreantShield(projectileObject, blocker);
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

  private readonly handleMeleeHit = (
    target: Slime,
    attack: Readonly<Projectile['attack']>,
  ): void => {
    if (!target.active || target.aiState === 'defeated') return;
    const result = this.damageSystem.apply(target, attack);
    this.showDamageNumber(target.x, target.y, result);
    if (result.defeated) target.playDefeat();
    else target.showHit();
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

  private readonly fireEnemyProjectiles = (enemy: AdvancedEnemy, pattern: BulletPattern,
    volley = 0, speedFactor = 1): void => {
    if (!this.player || !this.enemyProjectiles || this.gameOver || this.transitioning) return;
    const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    const angles = shotAngles(pattern, angle, volley);
    const speed = (enemy.kind === 'boss' ? 220 + getBossTier(enemy.stats.roomNumber) * 8 :
      enemy.kind === 'mage' ? 220 : 320) * speedFactor;
    const color = enemy.isBoss ? getBossProfile(enemy.stats.roomNumber, enemy.bossSlot).color :
      enemy.kind === 'mage' ? 0xa78bfa : 0xfb7185;
    for (const direction of angles) {
      const bullet = new EnemyProjectile(
        this, enemy.x + Math.cos(direction) * 30,
        enemy.y + Math.sin(direction) * 30,
        Math.cos(direction), Math.sin(direction),
        speed, enemy.stats.damage * (enemy.isBoss ? 0.57 : 1), color,
      );
      if (this.worldId === 2 && enemy.kind === 'archer') bullet.statusEffect = 'slow';
      if (this.worldId === 2 && enemy.kind === 'mage') bullet.statusEffect = 'freeze';
      addAndLaunch(bullet, () => this.enemyProjectiles!.add(bullet),
        { x: Math.cos(direction), y: Math.sin(direction) }, speed);
    }
    if (this.worldId === 2 && enemy.isBoss && !this.roomProgress.doorOpen) {
      if (enemy.stats.roomNumber === ICE_WALL.room && volley % ICE_WALL.everyVolleys === 0) {
        this.launchFrozenWall(enemy, volley);
      }
      if (enemy.stats.roomNumber === HOMING_ORB.room && volley % HOMING_ORB.everyVolleys === 0) {
        this.launchHomingOrb(enemy);
      }
    }
  };

  /** Blizzard Tyrant's frosty seeker pursues the player's *current* position
   * for at most fifteen seconds and obeys normal projectile hit/slow rules.
   */
  private launchHomingOrb(enemy: AdvancedEnemy): void {
    if (!this.player || !this.enemyProjectiles) return;
    const alive = this.enemyProjectiles.getChildren()
      .filter(child => child instanceof HomingEnemyProjectile && child.active).length;
    if (alive >= HOMING_ORB.maxActive) return;
    const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const orb = new HomingEnemyProjectile(this,
      enemy.x + dx / length * 43, enemy.y + dy / length * 43,
      { x: this.player.x, y: this.player.y },
      enemy.stats.damage * HOMING_ORB.damageMultiplier);
    this.enemyProjectiles.add(orb);
  }

  /** Crystal Empress sends an ice barrier from the left arena wall all the
   * way across. The telegraph marks its collision area and a narrow safe gap.
   */
  private launchFrozenWall(enemy: AdvancedEnemy, volley: number): void {
    if (!this.player || !this.currentRoom ||
        this.frozenWalls.size > 0 || this.roomProgress.doorOpen) return;
    const bounds = this.currentRoom.layout.bounds;
    const gapY = wallGapCenter(this.player.y, bounds, volley);
    const warning = this.add.graphics().setDepth(24);
    const ice = this.add.graphics().setDepth(27);
    const now = this.time.now;
    this.frozenWalls.add({
      warning, ice, bounds, gapY, warnAt: now,
      launchAt: now + ICE_WALL.warningMs,
      hit: false, owner: enemy,
      damage: enemy.stats.damage * ICE_WALL.damageMultiplier,
    });
  }

  private updateFrozenWalls(now: number): void {
    for (const wall of this.frozenWalls) {
      const { bounds, gapY } = wall;
      const top = bounds.y, bottom = bounds.y + bounds.height;
      const upper = Math.max(0, gapY - ICE_WALL.gapHalfHeight - top);
      const lowerStart = gapY + ICE_WALL.gapHalfHeight;
      const lower = Math.max(0, bottom - lowerStart);
      const remove = (): void => {
        wall.warning.destroy();
        wall.ice.destroy();
        this.frozenWalls.delete(wall);
      };
      if (!wall.owner.active || wall.owner.aiState === 'defeated' ||
          this.roomProgress.doorOpen) { remove(); continue; }
      if (now < wall.launchAt) {
        // Full-arena translucent warning, leaving a clearly marked dodge gap.
        const pulse = 0.12 + 0.09 * (0.5 + Math.sin(now / 60) * 0.5);
        wall.warning.clear();
        wall.warning.fillStyle(0x38bdf8, pulse);
        wall.warning.fillRect(bounds.x, top, bounds.width, upper);
        wall.warning.fillRect(bounds.x, lowerStart, bounds.width, lower);
        wall.warning.fillStyle(0xcffafe, 0.48);
        wall.warning.fillRect(bounds.x, gapY - ICE_WALL.gapHalfHeight - 2, bounds.width, 3);
        wall.warning.fillRect(bounds.x, lowerStart, bounds.width, 3);
        wall.warning.lineStyle(5, 0x67e8f9, 0.95);
        wall.warning.lineBetween(bounds.x + 4, top, bounds.x + 4, gapY - ICE_WALL.gapHalfHeight);
        wall.warning.lineBetween(bounds.x + 4, lowerStart, bounds.x + 4, bottom);
        continue;
      }
      wall.warning.clear();
      const startX = bounds.x - ICE_WALL.thickness;
      const x = wallXAt(startX, wall.launchAt, now);
      const prevX = wallXAt(startX, wall.launchAt, now - 70);
      if (x - ICE_WALL.thickness > bounds.x + bounds.width) { remove(); continue; }

      // Two thick ice segments with a bright leading edge and jagged facets.
      const thickness = ICE_WALL.thickness;
      const leadingX = x + thickness / 2;
      const drawSegment = (sy: number, h: number): void => {
        if (h <= 0) return;
        wall.ice.fillStyle(0x082f49, 0.84);
        wall.ice.fillRect(x - thickness / 2, sy, thickness, h);
        wall.ice.fillStyle(0x7dd3fc, 0.72);
        wall.ice.fillRect(x - thickness / 2 + 5, sy, 25, h);
        wall.ice.fillStyle(0xdffcff, 0.92);
        wall.ice.fillRect(leadingX - 6, sy, 6, h);
        for (let y = sy + 8; y < sy + h - 9; y += 35) {
          wall.ice.fillStyle(0xe0f2fe, 0.85);
          wall.ice.fillTriangle(leadingX - 6, y - 12,
            leadingX + 13, y, leadingX - 6, y + 12);
          wall.ice.lineStyle(1, 0x38bdf8, 0.8);
          wall.ice.lineBetween(x - thickness / 2 + 8, y - 12, leadingX - 6, y + 12);
        }
      };
      wall.ice.clear();
      drawSegment(top, upper);
      drawSegment(lowerStart, lower);

      // Swept collision guards against fast ice walls skipping across a player
      // between rendered frames; damage is applied only once per cast.
      if (!wall.hit && this.player) {
        const hero = { x: this.player.x, y: this.player.y };
        const atCurrentPosition = wallHitsCircle(x, gapY, hero, ICE_WALL.playerPadding);
        const crossedPlayer = hero.x >= Math.min(prevX, x) - thickness / 2 -
          ICE_WALL.playerPadding &&
          hero.x <= Math.max(prevX, x) + thickness / 2 + ICE_WALL.playerPadding &&
          Math.abs(hero.y - gapY) + ICE_WALL.playerPadding > ICE_WALL.gapHalfHeight;
        if (atCurrentPosition || crossedPlayer) {
          wall.hit = true;
          this.damagePlayer({ damage: wall.damage, criticalChance: 0, criticalMultiplier: 1 });
        }
      }
    }
  }

  private clearFrozenWalls(): void {
    for (const wall of this.frozenWalls) {
      wall.warning.destroy();
      wall.ice.destroy();
    }
    this.frozenWalls.clear();
  }

  /** Telegraph targeted bombs well before detonation. All timers are cancelled on room exit. */
  private readonly dropBossBombs = (enemy: AdvancedEnemy, targetX: number, targetY: number,
    count: number, radius: number, windupMs: number): void => {
    if (!this.player || this.gameOver || this.transitioning || this.roomProgress.doorOpen) return;
    if (this.worldId === 2 && enemy.kind === 'bomber') {
      this.throwFrozenSlowBomb(enemy, targetX, targetY, radius, windupMs);
      return;
    }
    if (enemy.isPoisonAlchemist) {
      this.throwPoisonBottles(enemy, targetX, targetY, count, radius);
      return;
    }
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    for (let i = 0; i < count; i++) {
      const angle = (i - 1) * Math.PI * 2 / Math.max(1, count - 1) + this.time.now / 1300;
      const distance = i === 0 ? 0 : 86;
      const x = Phaser.Math.Clamp(targetX + Math.cos(angle) * distance,
        bounds.x + radius + 6, bounds.x + bounds.width - radius - 6);
      const y = Phaser.Math.Clamp(targetY + Math.sin(angle) * distance,
        bounds.y + radius + 6, bounds.y + bounds.height - radius - 6);
      const warning = this.add.circle(x, y, radius, 0xfb923c, 0.14)
        .setStrokeStyle(3, 0xfbbf24, 0.92).setDepth(24);
      this.bombWarnings.add(warning);
      let timer: Phaser.Time.TimerEvent;
      timer = this.time.delayedCall(windupMs, () => {
        this.bombTimers.delete(timer);
        this.bombWarnings.delete(warning);
        if (!warning.active) return;
        warning.destroy();
        if (!enemy.active || enemy.aiState === 'defeated' || this.gameOver ||
          this.transitioning || this.choosingUpgrade || this.roomProgress.doorOpen) return;
        const impact = this.add.circle(x, y, radius, 0xf97316, 0.55)
          .setStrokeStyle(3, 0xffedd5).setDepth(29);
        this.tweens.add({ targets: impact, alpha: 0, scale: 1.1, duration: 235,
          onComplete: () => impact.destroy() });
        if (this.player && withinRadius(x, y, this.player.x, this.player.y, radius)) {
          this.damagePlayer({
            damage: enemy.stats.damage * 0.62, criticalChance: 0, criticalMultiplier: 1,
          });
        }
      });
      this.bombTimers.add(timer);
    }
  };

  /** A thrown ice bomb lands in a visible slow patch, causing mild contact damage. */
  private throwFrozenSlowBomb(enemy: AdvancedEnemy, targetX: number, targetY: number,
    radius: number, windupMs: number): void {
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    const x = Phaser.Math.Clamp(targetX, bounds.x + radius, bounds.x + bounds.width - radius);
    const y = Phaser.Math.Clamp(targetY, bounds.y + radius, bounds.y + bounds.height - radius);
    const bomb = this.add.circle(enemy.x, enemy.y, 11, 0x67e8f9, 0.95)
      .setStrokeStyle(3, 0xffffff).setDepth(30);
    const indicator = this.add.circle(x, y, radius, 0x67e8f9, 0.1)
      .setStrokeStyle(2, 0x7dd3fc, 0.75).setDepth(24);
    this.bombWarnings.add(indicator);
    const initialY = enemy.y;
    this.tweens.add({
      targets: bomb, x, y, scale: 1.3, duration: windupMs, ease: 'Linear',
      onUpdate: tween => bomb.setY(Phaser.Math.Linear(initialY, y, tween.progress) -
        Math.sin(Math.PI * tween.progress) * 75),
      onComplete: () => {
        bomb.destroy();
        this.bombWarnings.delete(indicator);
        indicator.destroy();
        if (this.roomProgress.doorOpen || this.gameOver || this.transitioning) return;
        const patch = this.add.circle(x, y, radius, 0x7dd3fc, 0.28)
          .setStrokeStyle(2, 0xbae6fd, 0.75).setDepth(22);
        this.bombWarnings.add(patch);
        let lastDamageAt = 0;
        let ticks = 0;
        const timer = this.time.addEvent({ delay: 100, repeat: 24, callback: () => {
          ticks++;
          if (!patch.active || !this.player || this.roomProgress.doorOpen) return;
          if (withinRadius(x, y, this.player.x, this.player.y, radius)) {
            this.player.applyMovementPenalty(this.time.now, 550, 0.46);
            if (this.time.now >= lastDamageAt) {
              lastDamageAt = this.time.now + 850;
              this.damagePlayer({ damage: enemy.stats.damage * 0.23, criticalChance: 0, criticalMultiplier: 1 });
            }
          }
          if (ticks >= 25) {
            patch.destroy(); this.bombWarnings.delete(patch); this.bombTimers.delete(timer);
          }
        } });
        this.bombTimers.add(timer);
      },
    });
    bomb.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(bomb));
    this.bombWarnings.add(bomb);
  }

  /** Each green bottle visibly arcs from the alchemist to its target before
   * breaking. Impact creates a five-second damaging poison circle.
   */
  private throwPoisonBottles(enemy: AdvancedEnemy, targetX: number,
    targetY: number, count: number, radius: number): void {
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    for (let i = 0; i < count; i++) {
      const theta = i * Math.PI * 2 / Math.max(1, count);
      const offset = i === 0 ? 0 : 90;
      const x = Phaser.Math.Clamp(targetX + Math.cos(theta) * offset,
        bounds.x + radius + 8, bounds.x + bounds.width - radius - 8);
      const y = Phaser.Math.Clamp(targetY + Math.sin(theta) * offset,
        bounds.y + radius + 8, bounds.y + bounds.height - radius - 8);
      const glass = this.add.ellipse(0, 4, 17, 23, 0x4ade80)
        .setStrokeStyle(2, 0xd9f99d);
      const neck = this.add.rectangle(0, -10, 8, 10, 0x14532d)
        .setStrokeStyle(1, 0xa3e635);
      const cork = this.add.rectangle(0, -16, 11, 5, 0xc9a66b);
      const shine = this.add.circle(-4, 1, 3, 0xecfccb, 0.85);
      const bottle = this.add.container(enemy.x, enemy.y - 22, [glass, neck, cork, shine])
        .setDepth(32);
      this.poisonBottles.add(bottle);
      const fromX = bottle.x, fromY = bottle.y;
      this.tweens.addCounter({
        from: 0, to: 1, duration: SPORE_POISON.bottleFlightMs + i * 55,
        ease: 'Linear',
        onUpdate: tween => {
          if (!bottle.active) return;
          const t = tween.getValue() ?? 0;
          bottle.setPosition(
            Phaser.Math.Linear(fromX, x, t),
            Phaser.Math.Linear(fromY, y, t) - 74 * Math.sin(Math.PI * t),
          );
          bottle.setRotation(t * Math.PI * 1.5);
        },
        onComplete: () => {
          if (!bottle.active) return;
          this.poisonBottles.delete(bottle);
          bottle.destroy();
          if (this.gameOver || this.transitioning || this.chapterComplete ||
              this.roomProgress.doorOpen || !enemy.active || enemy.aiState === 'defeated') return;
          this.createPoisonPool(x, y, radius, enemy.stats.damage * SPORE_POISON.damageMultiplier);
        },
      });
    }
  }

  private createPoisonPool(x: number, y: number, radius: number, damage: number): void {
    const circle = this.add.circle(x, y, radius, 0x22c55e, 0.32)
      .setStrokeStyle(4, 0x86efac, 0.93).setDepth(23);
    const now = this.time.now;
    this.poisonPools.add({ circle, x, y, radius, startAt: now,
      nextTickAt: now, damage });
  }

  private updatePoisonPools(now: number): void {
    for (const pool of this.poisonPools) {
      if (!poisonActive(now, pool.startAt) || this.roomProgress.doorOpen) {
        pool.circle.destroy();
        this.poisonPools.delete(pool);
        continue;
      }
      const progress = (now - pool.startAt) / SPORE_POISON.durationMs;
      pool.circle.setAlpha(Math.min(1, (1 - progress) * 2.2));
      pool.circle.setScale(1 + 0.035 * Math.sin(now / 120));
      if (!this.player || !poisonTickDue(now, pool.nextTickAt)) continue;
      if (!poisonCovers(pool.x, pool.y, pool.radius, this.player.x, this.player.y)) continue;
      pool.nextTickAt = now + SPORE_POISON.tickMs;
      this.damagePlayer({ damage: pool.damage, criticalChance: 0, criticalMultiplier: 1 }, 600);
    }
  }

  private clearBossBombs(): void {
    for (const timer of this.bombTimers) timer.remove(false);
    this.bombTimers.clear();
    for (const warning of this.bombWarnings) if (warning.active) warning.destroy();
    this.bombWarnings.clear();
    this.clearFrozenWalls();
    for (const bottle of this.poisonBottles) {
      this.tweens.killTweensOf(bottle);
      bottle.destroy();
    }
    this.poisonBottles.clear();
    for (const pool of this.poisonPools) pool.circle.destroy();
    this.poisonPools.clear();
  }

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
    const statusEffect = bulletObject.statusEffect;
    bulletObject.destroy();
    if (statusEffect === 'slow') playerObject.applyMovementPenalty(this.time.now, 1900, 0.57);
    if (statusEffect === 'freeze') playerObject.applyMovementPenalty(this.time.now, 1400, 0);
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
    if (shouldParryHit(this.player.heroId, Math.random())) {
      // A parried hit deals zero damage and consumes the same i-frame window
      // as a normal hit: overlapping melee enemies cannot repeatedly reroll.
      this.player.beginInvulnerability(this.time.now, iframeMs);
      this.showPlayerParry();
      return;
    }
    const result = this.damageSystem.apply(this.player, attack);
    this.player.beginInvulnerability(this.time.now, iframeMs);
    this.drawPlayerHealth();
    if (result.defeated) this.endRun();
    else this.showPlayerHit();
  }

  private updateBossHud(): void {
    for (let slot = 0; slot < 2; slot++) {
      const boss = this.activeBosses[slot];
      const bar = this.bossHealthBars[slot];
      const name = this.bossNameTexts[slot];
      if (!bar || !name) continue;
      const visible = !!boss && boss.active && boss.aiState !== 'defeated';
      bar.setVisible(visible).clear();
      name.setVisible(visible);
      if (!visible || !boss) continue;
      name.setText(getWorldBossName(this.worldId, this.roomProgress.roomNumber, boss.bossSlot) +
        (boss.healthRatio <= 0.5 ? ' · FASE 2' : ' · FASE 1'));
      const y = 153 + slot * 44;
      bar.fillStyle(0x020617, 0.95);
      bar.fillRoundedRect((GAME_WIDTH - 270) / 2, y, 270, 14, 4);
      bar.fillStyle(boss.healthRatio <= 0.5 ? 0xef4444 : 0xf59e0b);
      bar.fillRoundedRect((GAME_WIDTH - 270) / 2 + 2, y + 2, 266 * boss.healthRatio, 10, 3);
    }
  }

  private readonly summonFrozenMinions = (enemy: AdvancedEnemy, count: number): void => {
    if (this.worldId !== 2 || !this.enemies || !this.currentRoom ||
      this.roomProgress.doorOpen || this.gameOver || this.transitioning) return;
    if (this.aliveEnemies >= 48) return;
    const bounds = this.currentRoom.layout.bounds;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Clamp(enemy.x + (i === 0 ? -48 : 48),
        bounds.x + 34, bounds.x + bounds.width - 34);
      const y = Phaser.Math.Clamp(enemy.y + (i === 0 ? -26 : 26),
        bounds.y + 38, bounds.y + bounds.height - 38);
      const summoned = this.enemySpawner?.spawnSlimes([{ x, y }],
        getSlimeStatsForRoom(this.currentRoom.number, 2))[0];
      if (summoned) {
        summoned.setTexture(getWorldCharacter(2, 'slime').textureKey);
        this.roomProgress.addRequiredEnemies(1);
      }
    }
  };

  private readonly handleEnemySpawned = (): void => {
    this.aliveEnemies += 1;
    this.updateEnemyCount();
  };

  private readonly handleEnemyDefeated = (enemy: Slime): void => {
    const kind = enemy instanceof AdvancedEnemy ? enemy.kind : 'slime';
    if (this.gameOver || !this.run.defeatEnemy(enemy.enemyId, kind)) return;
    this.spawnCoins(enemy.x, enemy.y, kind);
    if (this.worldId === 2 && enemy instanceof AdvancedEnemy && enemy.kind === 'tank') {
      this.summonFrozenMinions(enemy, 2);
    }
    this.aliveEnemies = Math.max(0, this.aliveEnemies - 1);
    this.updateEnemyCount();
    if (this.roomProgress.registerEnemyDefeated()) {
      this.abilities?.pauseCooldowns(this.time.now);
      // All scheduled enemies are dead; residual bullets must not harm the player.
      this.enemyProjectiles?.clear(true, true);
      this.clearBossBombs();
      // RunLedger tracks unique clears: extra death events must never grant
      // repeated healing or gold for an already cleared chamber.
      if (this.run.clearRoom(this.roomProgress.roomNumber)) {
        this.grantRoomClearHealing(this.roomProgress.roomNumber);
      }
      this.openDoor();
      if (this.roomProgress.roomNumber < CHAPTER_ROOM_COUNT &&
        this.roomProgress.roomNumber % 2 === 0 && this.roomProgress.roomNumber % 5 !== 0) {
        this.showUpgradeOffer();
      }
    }
    this.updateGoldHud();
  };

  /** Coin drops remain in the chamber until picked up, never grant gold
   * instantly, and are discarded at room exit / run end. */
  private spawnCoins(x: number, y: number, kind: Parameters<typeof coinDropsForEnemy>[0]): void {
    const drops = coinDropsForEnemy(kind);
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    for (let i = 0; i < drops.length; i += 1) {
      const angle = Math.PI * 2 * i / drops.length - Math.PI / 2;
      const offset = drops.length === 1 ? 0 : 27;
      const coinX = Phaser.Math.Clamp(x + Math.cos(angle) * offset,
        bounds.x + 12, bounds.x + bounds.width - 12);
      const coinY = Phaser.Math.Clamp(y + Math.sin(angle) * offset,
        bounds.y + 12, bounds.y + bounds.height - 12);
      const coin = new CoinPickup(this, coinX, coinY, drops[i]!);
      this.coins.add(coin);
    }
  }

  private collectNearbyCoins(deltaMs: number): void {
    if (!this.player || this.coins.size === 0) return;
    let collected = 0;
    for (const coin of this.coins) {
      if (!coin.tick(this.player, deltaMs)) continue;
      const x = coin.x;
      const y = coin.y;
      const value = coin.value;
      if (this.run.collectGold(value)) {
        collected += value;
        // Small world-space feedback, no Arcade body or expensive overlap collider.
        const label = this.add.text(x, y - 10, `+${value}`, {
          color: '#fde047', fontFamily: 'system-ui, sans-serif',
          fontSize: '13px', fontStyle: 'bold',
          stroke: '#020617', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(60);
        this.tweens.add({
          targets: label, y: y - 36, alpha: 0, duration: 500,
          onComplete: () => label.destroy(),
        });
      }
      this.coins.delete(coin);
      coin.destroy();
    }
    if (collected > 0) this.updateGoldHud();
  }

  private clearCoins(): void {
    for (const coin of this.coins) coin.destroy();
    this.coins.clear();
    this.updateGoldHud();
  }

  private grantRoomClearHealing(clearedRoom: number): void {
    if (!this.player) return;
    const reward = roomClearHealing(
      clearedRoom, this.player.currentHp, this.player.maxHp,
    );
    const restored = this.player.heal(reward.amount);
    if (restored <= 0) return;
    this.drawPlayerHealth();

    const label = reward.boss ? 'BOSSBONUS' :
      reward.milestone ? 'MIJLPAAL' : 'KAMER VOLTOOID';
    const toast = this.add.text(GAME_WIDTH / 2, 115, `+${Math.ceil(restored)} HP  ·  ${label}`, {
      color: '#86efac', fontFamily: 'system-ui, sans-serif',
      fontSize: '14px', fontStyle: 'bold',
      stroke: '#020617', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(130).setScrollFactor(0);
    this.tweens.add({
      targets: toast, y: 96, alpha: 0,
      delay: 400, duration: 1300, ease: 'Sine.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

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
    this.healthBar ??= this.add.graphics().setDepth(120).setScrollFactor(0);
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
      .setDepth(121).setScrollFactor(0);
    this.healthText.setText(`${this.player.currentHp} / ${this.player.maxHp}`);
  }

  private showPlayerParry(): void {
    if (!this.player) return;
    const { x, y } = this.player;
    const shield = this.add.circle(x, y, 34, 0x67e8f9, 0.14)
      .setStrokeStyle(4, 0xfef08a, 1).setDepth(31);
    const label = this.add.text(x, y - 40, 'PARRY!', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.tweens.add({
      targets: shield, scale: 1.4, alpha: 0, duration: 230,
      ease: 'Quad.easeOut', onComplete: () => shield.destroy(),
    });
    this.tweens.add({
      targets: label, y: y - 70, alpha: 0, duration: 390,
      ease: 'Quad.easeOut', onComplete: () => label.destroy(),
    });
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
    this.goldHudText?.setText(`DEZE RUN: +${this.run.runGold} G  ·  MUNTEN ${this.coins.size}`);
  }

  /** A brief magic pulse reveals the upgrade cards in sequence.
   * Combat stays frozen until the offer is chosen. */
  private showUpgradeOffer(): void {
    if (!this.player || this.choosingUpgrade) return;
    const cards = this.upgrades.offer(this.player.currentHp < this.player.maxHp);
    if (cards.length < 3) return;
    this.choosingUpgrade = true;
    this.upgradeReady = false;
    this.player.setVelocity(0, 0);
    this.controls?.cancelTouches();
    this.physics.world.pause();

    const centerX = GAME_WIDTH / 2;
    const overlay = this.add.container(0, 0).setDepth(170).setScrollFactor(0);
    this.upgradeOverlay = overlay;
    const shade = this.add.rectangle(centerX, 422, GAME_WIDTH, 844, 0x020617, 0.94)
      .setInteractive();
    overlay.add(shade);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 210, ease: 'Sine.easeOut' });

    const pulse = this.add.circle(centerX, 180, 20, 0xfde68a, 0.12)
      .setStrokeStyle(4, 0xfbbf24, 0.92);
    overlay.add(pulse);
    this.tweens.add({
      targets: pulse, scale: 4.8, alpha: 0, duration: 640,
      ease: 'Cubic.easeOut', onComplete: () => pulse.destroy(),
    });

    const title = this.add.text(centerX, 174, '✦  POWER-UP!  ✦', {
      fontFamily: 'system-ui, sans-serif', fontSize: '28px',
      fontStyle: 'bold', color: '#fde68a', stroke: '#78350f', strokeThickness: 3,
    }).setOrigin(0.5).setScale(0.35).setAlpha(0);
    overlay.add(title);
    this.tweens.add({
      targets: title, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 440, ease: 'Back.easeOut',
    });
    const subtitle = this.add.text(centerX, 219, 'KIES ÉÉN VERSTERKING', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cbd5e1',
    }).setOrigin(0.5).setAlpha(0);
    overlay.add(subtitle);
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 240, delay: 310 });

    cards.forEach((card, index) => {
      const { x, y, width, height } = upgradeCardBounds(GAME_WIDTH, index);
      const border = card.rarity === 'epic' ? 0xc084fc :
        card.rarity === 'rare' ? 0x38bdf8 : 0x94a3b8;
      const cardContainer = this.add.container(x, y).setScale(0.65).setAlpha(0);
      const plate = this.add.rectangle(0, 0, width, height, 0x172338)
        .setStrokeStyle(2, border);
      // Stable top-level hit box, independent of animated nested Container
      // transforms and the scrolling world camera.
      const hitArea = this.add.zone(x, y, width, height)
        .setScrollFactor(0).setDepth(171)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => this.chooseUpgrade(card.id));
      this.upgradeHitAreas.push(hitArea);
      cardContainer.add(plate);
      cardContainer.add(this.add.text(-149, -32, card.name.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif', fontSize: '17px',
        fontStyle: 'bold', color: '#f8fafc',
      }));
      cardContainer.add(this.add.text(-149, -5, card.description, {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#cbd5e1',
      }));
      cardContainer.add(this.add.text(-149, 19,
        card.rarity.toUpperCase() + '   ·   ' + (this.upgrades.count(card.id) + 1) + '/' + card.maxStacks, {
        fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#94a3b8',
      }));
      overlay.add(cardContainer);
      this.tweens.add({
        targets: cardContainer, scaleX: 1, scaleY: 1, alpha: 1,
        delay: 480 + index * 135, duration: 360, ease: 'Back.easeOut',
        onComplete: () => { if (index === cards.length - 1) this.upgradeReady = true; },
      });
    });
  }

  private chooseUpgrade(id: RunUpgradeId): void {
    if (!this.choosingUpgrade || !this.upgradeReady || !this.player || !this.weapon ||
      !this.upgrades.choose(id)) return;
    if (id === 'projectile') this.weapon.extraProjectiles += 1;
    else if (id === 'piercing') this.weapon.extraPiercing += 1;
    else this.player.applyRunBonus(id);
    this.upgradeHitAreas.forEach(hitArea => hitArea.destroy());
    this.upgradeHitAreas = [];
    this.upgradeOverlay?.destroy(true);
    this.upgradeOverlay = undefined;
    this.choosingUpgrade = false;
    this.upgradeReady = false;
    this.physics.world.resume();
    this.drawPlayerHealth();
  }

  private completeRun(victory: boolean): void {
    if (this.gameOver || this.chapterComplete) return;
    if (victory) this.chapterComplete = true;
    else this.gameOver = true;
    // Render Game Over before deleting a large room's sprites and collisions.
    // Scene.start() here forces synchronous SHUTDOWN/cleanup in the death frame,
    // which causes the apparent freeze in crowded later chambers.
    this.player?.setVelocity(0, 0);
    this.controls?.cancelTouches();
    this.physics.world.pause();
    this.pendingSpawnIndices = [];
    const report = this.run.report(victory);
    progressStore.dispatch({ type: 'settleRun', report });
    this.scene.launch(GAME_OVER_SCENE_KEY, {
      report, chosenUpgrades: this.upgrades.chosen(),
    });
    this.scene.sleep();
  }

  private finishChapterRooms(): void { this.completeRun(true); }

  private endRun(): void { this.completeRun(false); }

  private shutdown(): void {
    this.physics.world.resume();
    this.clearCoins();
    this.clearBossBombs();
    this.upgradeHitAreas.forEach(hitArea => hitArea.destroy());
    this.upgradeHitAreas = [];
    this.upgradeOverlay?.destroy(true);
    this.upgradeOverlay = undefined;
    this.upgradeReady = false;
    this.abilities?.destroy();
    this.abilities = undefined;
    this.weapon?.clearGroundEffects();
    this.controls?.destroy();
    this.projectiles?.clear(true, true);
    this.enemies?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);
    this.obstacles?.clear(true, true);
    this.arenaArt?.destroy(true);
    this.arenaArt = undefined;
    this.currentRoom = undefined;
    this.events.off(ENEMY_SPAWNED_EVENT, this.handleEnemySpawned);
    this.events.off(ENEMY_DEFEATED_EVENT, this.handleEnemyDefeated);
    this.controls = undefined;
    this.pendingSpawnIndices = [];
    this.waveSettings = undefined;
    this.weapon = undefined;
    this.projectiles = undefined;
    this.enemies = undefined;
    this.enemyProjectiles = undefined;
    this.activeBosses = [];
    this.bossHealthBars.length = 0;
    this.bossNameTexts.length = 0;
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
    this.doorHintText = undefined;
    this.player = undefined;
  }
}

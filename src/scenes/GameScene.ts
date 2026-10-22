import Phaser from 'phaser';
import { AbilityController } from '../abilities/AbilityController';

import { DamageSystem, type DamageResult } from '../combat/damage';
import { shouldParryHit } from '../combat/parry';
import { addAndLaunch } from '../combat/launchProjectile';
import { GAME_SCENE_KEY, GAME_TITLE, GAME_OVER_SCENE_KEY, GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { EnemySpawner } from '../enemies/EnemySpawner';
import { getBossProfile, getBossTier } from '../enemies/bossProfiles';
import { MOSS_DASH, ROOT_BRANCH, rootBurstAngles } from '../enemies/worldOneBossBalance';
import { SPORE_POISON, poisonActive, poisonCovers, poisonTickDue } from '../enemies/poisonHazard';
import { selectPoisonLocations, type PoisonCircle } from '../enemies/poisonPlacement';
import { rootWavePoint, rootTipHits } from '../enemies/rootGrowth';
import { JADE_BRANCH, HEART_TREE, jadeBranchLanes, groveBranchTip,
  groveBranchHits, groveTreeHits, type GroveBranchLane } from '../enemies/groveAttacks';
import { AdvancedEnemy, type BulletPattern } from '../enemies/AdvancedEnemy';
import { EnemyProjectile, type EnemyProjectileEffect } from '../enemies/EnemyProjectile';
import { ricochetAxis } from '../enemies/enemyRicochet';
import { WORLD1_BRIAR_ARROW_SPEED_MULTIPLIER } from '../enemies/enemyBalance';
import { HomingEnemyProjectile } from '../enemies/HomingEnemyProjectile';
import { coverIsClose, firstShieldOnPath, type ShieldPoint } from '../enemies/treantShield';
import { ICE_WALL, HOMING_ORB, wallGapCenter, wallHitsCircle, wallXAt } from '../enemies/frozenBossAttacks';
import { FROZEN_EARLY, canSummonFrostMinions } from '../enemies/frozenEarlyGame';
import { contactHitReady, nextContactHitAt } from '../combat/enemyContactDamage';
import { FROZEN_BALANCE } from '../enemies/frozenBalance';
import { shouldSplitFrozenGiant } from '../enemies/frozenSplit';
import { withinRadius } from '../enemies/enemyMovement';
import { splitTwinShotAngle, shotAngles } from '../enemies/projectilePatterns';
import {
  ENEMY_DEFEATED_EVENT,
  ENEMY_SPAWNED_EVENT,
  Slime,
} from '../enemies/Slime';
import { Player } from '../entities/Player';
import { ensureDressedHeroTexture } from '../heroes/heroEquipmentArt';
import { CoinPickup } from '../entities/CoinPickup';
import { XpPickup } from '../entities/XpPickup';
import { ArmorPickup } from '../entities/ArmorPickup';
import { rollEnemyArmor, chooseArmorDropHero, armorDefinition, RARITY_CONFIG, type ArmorItem } from '../progression/armor';
import { xpDropsForEnemy } from '../progression/heroXp';
import { heroXpRequirement } from '../progression/ProgressStore';
import { HEROES, MAX_HERO_LEVEL } from '../heroes/heroConfig';
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
import { armorBonuses } from '../progression/armor';
import { RunLedger } from '../progression/RunLedger';
import { runCheckpointStore, type RunCheckpoint } from '../progression/RunCheckpoint';
import { MENU_SCENE_KEY } from '../config/constants';
import { coinDropsForEnemy } from '../progression/coinRewards';
import { roomClearHealing } from '../progression/roomHealing';
import { RunUpgradeDeck, type RunUpgradeId } from '../progression/runUpgrades';
import { getWorld, getWorldBossName, type WorldId } from '../worlds/worldConfig';
import { BRAMBLE_CINEMATIC, amplifiedTwinVolleyIndex, brambleDamageAllowed,
  brambleWindLanding, nextBrambleStage, type BrambleStage } from '../enemies/brambleCinematic';
import { drawFrozenFloor } from '../worlds/iceFloorArt';
import { ICE_ENEMY_STEERING, iceVelocity } from '../worlds/iceMotion';
import { findChainTargets } from '../weapons/chainLightning';
import { runeBounceTarget } from '../weapons/runeTome';
import { upgradeCardBounds } from '../ui/upgradeLayout';
import { displayedHp } from '../ui/displayValues';
import { EMBER_ATTACKS } from '../enemies/emberWastes';
import { EMBER_BOSS_ATTACKS, laserDirection, pointToLaserDistance,
  type EmberBossAttack } from '../enemies/emberBosses';

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
  private readonly xpCrystals = new Set<XpPickup>();
  private readonly armorDrops = new Set<ArmorPickup>();
  private collectedRunArmor: ArmorItem[] = [];
  private xpHudText?: Phaser.GameObjects.Text;
  private levelUpGlow?: Phaser.GameObjects.Container;
  private levelUpGlowEndAt = 0;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private enemies?: Phaser.Physics.Arcade.Group;
  private enemyProjectiles?: Phaser.Physics.Arcade.Group;
  private readonly bombTimers = new Set<Phaser.Time.TimerEvent>();
  private readonly glacierBoulders = new Set<{
    ball: Phaser.GameObjects.Container; x: number; y: number;
    vx: number; vy: number; owner: AdvancedEnemy; damage: number;
  }>();
  private readonly fallingSnowballs = new Set<Phaser.GameObjects.Container>();
  private readonly bombWarnings = new Set<Phaser.GameObjects.Arc>();
  private readonly rootEffects = new Set<Phaser.GameObjects.Graphics>();
  private readonly jadeBranches = new Set<{
    lane: GroveBranchLane; graphic: Phaser.GameObjects.Graphics;
    owner: AdvancedEnemy; startsAt: number; expiresAt: number; nextHitAt: number;
  }>();
  /** Includes telegraphing and growing trees, not only finished attacks. */
  private readonly groveTreeZones = new Set<{
    site: PoisonCircle; graphic: Phaser.GameObjects.Graphics;
  }>();
  private readonly frozenWalls = new Set<{
    warning: Phaser.GameObjects.Graphics; ice: Phaser.GameObjects.Graphics;
    bounds: { x: number; y: number; width: number; height: number };
    gapY: number; warnAt: number; launchAt: number; hit: boolean;
    damage: number; owner: AdvancedEnemy;
  }>();
  private readonly witchSummons = new Map<AdvancedEnemy, Set<Slime>>();
  private frostStatusVisual?: Phaser.GameObjects.Graphics;
  private readonly poisonBottles = new Set<Phaser.GameObjects.Container>();
  /** Locations reserved by in-flight bottles; kept disjoint from active pools. */
  private readonly poisonReservations = new Set<PoisonCircle>();
  private readonly poisonPools = new Set<{
    circle: Phaser.GameObjects.Arc; x: number; y: number;
    radius: number; startAt: number; nextTickAt: number; damage: number;
  }>();
  private activeBosses: AdvancedEnemy[] = [];
  /** One lifecycle, not overlapping stage booleans. */
  private brambleStage: BrambleStage = 'idle';
  private brambleCutsceneUsed = false;
  private brambleSequence = 0;
  private brambleBoss?: AdvancedEnemy;
  private brambleOverlay?: Phaser.GameObjects.Container;
  private brambleMessage?: Phaser.GameObjects.Text;
  private readonly brambleEffects = new Set<Phaser.GameObjects.GameObject>();
  private readonly brambleTimers = new Set<Phaser.Time.TimerEvent>();
  private readonly bossHealthBars: Phaser.GameObjects.Graphics[] = [];
  private readonly bossNameTexts: Phaser.GameObjects.Text[] = [];
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private enemySpawner?: EnemySpawner;
  private door?: Phaser.GameObjects.Rectangle;
  private arenaArt?: Phaser.GameObjects.Container;
  private iceObstacleDecor?: Phaser.GameObjects.Graphics;
  private iceTrailGraphics?: Phaser.GameObjects.Graphics;
  private iceMarks: { x: number; y: number; vx: number; vy: number; expires: number }[] = [];
  private iceMarkCooldown = new WeakMap<Phaser.Physics.Arcade.Sprite, number>();
  /** Each touching enemy has its own strike interval, never a shared hero i-frame. */
  private readonly nextContactHit = new WeakMap<Slime, number>();
  private lastIceTrailRender = 0;
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
  private resumeRequested = false;
  private pausedByPlayer = false;
  private pausePanel?: Phaser.GameObjects.Container;
  private readonly damageSystem = new DamageSystem();
  private readonly roomProgress = new RoomProgress(CHAPTER_ROOM_COUNT);

  public constructor() {
    super(GAME_SCENE_KEY);
  }

  public init(data?: { resume?: boolean }): void {
    this.resumeRequested = data?.resume === true;
  }

  public create(): void {
    const resume = this.resumeRequested ? runCheckpointStore.load() : null;
    if (resume && !progressStore.current.settledRunIds.includes(resume.ledger.runId) &&
      progressStore.current.unlockedHeroes.includes(resume.heroId)) {
      progressStore.dispatch({ type: 'selectWorld', id: resume.worldId });
      progressStore.dispatch({ type: 'selectHero', id: resume.heroId });
      progressStore.dispatch({ type: 'selectWeapon', id: resume.weaponId });
    }
    const saved = resume && progressStore.current.selectedHero === resume.heroId &&
      progressStore.current.selectedWorld === resume.worldId &&
      progressStore.current.selectedWeapon === resume.weaponId &&
      !progressStore.current.settledRunIds.includes(resume.ledger.runId) ? resume : null;
    this.worldId = saved?.worldId ?? progressStore.current.selectedWorld;
    this.collectedRunArmor = [];
    this.roomProgress.reset();
    this.clearCoins();
    this.aliveEnemies = 0;
    this.gameOver = false;
    this.transitioning = false;
    this.chapterComplete = false;
    this.choosingUpgrade = false;
    this.pausedByPlayer = false;
    this.pausePanel = undefined;
    this.brambleStage = 'idle';
    this.brambleCutsceneUsed = false;
    this.brambleSequence++;
    this.run = new RunLedger(saved?.ledger.runId, this.worldId);
    if (saved) this.run.restore(saved.ledger);
    this.upgrades = new RunUpgradeDeck();
    if (saved) this.upgrades.restore(saved.upgrades);
    this.drawBackdrop();
    if (this.worldId === 2) this.iceTrailGraphics = this.add.graphics().setDepth(3);

    const firstRoom = getRoomDefinition(saved?.room ?? 1, this.worldId);
    this.roomProgress.roomNumber = firstRoom.number;
    const profile = progressStore.current;
    const gear = armorBonuses(profile.armorInventory, profile.equippedArmor[profile.selectedHero], profile.selectedHero);
    this.player = new Player(
      this,
      firstRoom.layout.playerSpawn.x,
      firstRoom.layout.playerSpawn.y,
      profile.selectedHero,
      profile.heroLevels[profile.selectedHero],
      gear,
    );
    // Equipment now changes the real gameplay sprite, not just an inventory icon.
    this.player.setTexture(ensureDressedHeroTexture(this, profile.selectedHero,
      profile.equippedArmor[profile.selectedHero], profile.armorInventory));
    if (saved) {
      for (const id of saved.upgrades) {
        if (id !== 'healing' && id !== 'projectile' && id !== 'piercing' &&
          id !== 'meleeRange' && id !== 'meleeStun') this.player.applyRunBonus(id);
      }
      this.player.currentHp = Math.min(this.player.maxHp, Math.max(1, saved.health));
      this.player.shieldHp = Math.min(this.player.maxShieldHp, saved.shield);
    }
    this.controls = new InputController(this);
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false, collideWorldBounds: true });
    this.enemyProjectiles = this.physics.add.group({ allowGravity: false });
    this.obstacles = this.physics.add.staticGroup();
    this.weapon = new WeaponController(
      this, this.player, this.projectiles,
      profile.selectedWeapon, profile.weaponLevels[profile.selectedWeapon],
      0, 1 + gear.attackSpeed,
      this.enemies,
      this.handleMeleeHit,
      1 + gear.weaponDamage,
    );
    if (saved) for (const id of saved.upgrades) {
      if (id === 'projectile') this.weapon.extraProjectiles += 1;
      if (id === 'piercing') this.weapon.extraPiercing += 1;
      if (id === 'meleeRange') this.weapon.extraMeleeRange += 0.2;
      if (id === 'meleeStun') this.weapon.meleeStunMs = 500;
    }
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
      () => this.gameOver || this.transitioning || this.chapterComplete || this.choosingUpgrade || this.brambleStage !== 'idle',
      this.enemyProjectiles,
      () => this.currentRoom?.layout,
      (origin, target) => this.findProtectingTreant(origin, target),
      (now, damage, durationMs) => this.weapon?.activateShotgunBuff(now,damage,durationMs) ?? false,
    );

    this.createPauseButton();
    // A resumed fight restarts at the previous room-entry checkpoint.
    // Do not overwrite it with any kills or loot from an unfinished room.
    this.captureRoomCheckpoint();
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

    if (this.pausedByPlayer || this.gameOver || this.transitioning || this.chapterComplete ||
        this.choosingUpgrade || this.brambleStage !== 'idle') {
      this.player.setVelocity(0, 0);
      return;
    }

    this.player.move(this.controls.getMovement(), delta, this.worldId === 2);
    if (this.worldId === 2) this.recordIceTrail(this.player, 105);
    this.updateLevelUpGlow();
    this.drawFrostStatus();
    this.collectNearbyCoins(delta);
    this.collectNearbyXp(delta);
    this.collectNearbyArmor(delta);
    // All room enemies are spawned up front, leaving no reinforcement indices.
    this.updateEnemyWaves();
    this.updateCamera();
    const aim = this.controls.getAim(this.player.x, this.player.y);
    this.player.face(aim);
    this.abilities?.update(this.time.now, delta);
    if (this.player.isFrozen) this.player.setVelocity(0, 0);
    this.updatePoisonPools(this.time.now);
    this.updateJadeBranches(this.time.now);
    this.updateFrozenWalls(this.time.now);
    this.updateGlacierBoulders(delta * (this.abilities?.enemyProjectileFactor(this.time.now) ?? 1));
    this.weapon.update(this.time.now, this.controls.isShooting(), aim);

    // Ranged world-1 mobs use nearby Ancient Treants as moving cover.
    const treants = this.liveTreantShields();
    for (const child of this.enemies.getChildren()) {
      if (!(child instanceof Slime) || child.aiState === 'defeated' || !child.active) continue;
      const previousVelocity = { x: child.body?.velocity.x ?? 0, y: child.body?.velocity.y ?? 0 };
      if (child instanceof AdvancedEnemy) {
        const nearestCover = this.worldId === 1 && (child.kind === 'archer' || child.kind === 'mage')
          ? treants.filter(tank => coverIsClose(child, tank))
              .sort((a, b) => Phaser.Math.Distance.Between(child.x, child.y, a.x, a.y) -
                Phaser.Math.Distance.Between(child.x, child.y, b.x, b.y))[0]
          : undefined;
        child.updateAI(this.player.x, this.player.y, this.time.now,
          this.fireEnemyProjectiles, this.explodeEnemy, this.dropBossBombs,
          nearestCover?.shieldSurface, this.summonFrostMinions,
          this.performRootAttack, this.dropDashTrailBomb, this.frozenBossSpecial,
          this.performJadeBranches, this.emberBossSpecial);
      } else {
        child.chase(this.player.x, this.player.y);
      }
      // All world-2 enemy types (including bosses) glide, but scripted dashes,
      // windups, knockback and stuns retain their intentional control.
      if (this.worldId === 2 && !child.isStunned(this.time.now) &&
          !child.isKnockedBack(this.time.now) &&
          !(child instanceof AdvancedEnemy && child.hasScriptedMotion)) {
        const body = child.body;
        if (body instanceof Phaser.Physics.Arcade.Body) {
          const next = iceVelocity(previousVelocity,
            { x: body.velocity.x, y: body.velocity.y }, delta, ICE_ENEMY_STEERING, {
              left: body.blocked.left || body.touching.left,
              right: body.blocked.right || body.touching.right,
              up: body.blocked.up || body.touching.up,
              down: body.blocked.down || body.touching.down,
            });
          child.setVelocity(next.x, next.y);
        }
      }
      if (this.worldId === 2) this.recordIceTrail(child, 210);
    }
    if (this.worldId === 2) this.renderIceTrails();
    for (const child of this.enemyProjectiles?.getChildren() ?? []) {
      if (child instanceof EnemyProjectile) {
        if (child instanceof HomingEnemyProjectile) {
          child.updateHoming(this.time.now, delta, this.player);
        }
        if (!child.active) continue;
        child.setSlowMotion(this.abilities?.enemyProjectileFactor(this.time.now) ?? 1);
        if (child.isOutsideArena()) {
          // The Briar Hunter's first arena-wall impact is a true reflection.
          if (child.bounceAtArenaEdge()) this.showBriarRicochet(child.x, child.y);
          else child.destroy();
        }
      }
    }
    this.updateBossHud();

    // One snapshot per frame: both gentle aim assist and bounce seek only
    // actually alive enemies, not defeated or removed corpses.
    const runeEnemies = this.enemies.getChildren()
      .filter((enemy): enemy is Slime => enemy instanceof Slime &&
        enemy.active && enemy.aiState !== 'defeated')
      .map(enemy => ({enemyId:enemy.enemyId,x:enemy.x,y:enemy.y}));
    for (const child of this.projectiles.getChildren()) {
      if (!(child instanceof Projectile) || !child.active) continue;
      child.updateIceSpikeTrail(this.time.now);
      child.updateRuneFlight(this.time.now, delta, runeEnemies);
      if (!child.active) continue;
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

    this.xpHudText = this.add.text(195, 715, '', {
      color: '#67e8f9', fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setScrollFactor(0);
    this.updateXpHud();
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

  /** Reuses one small vector layer, never emitting one particle sprite per step. */
  private recordIceTrail(sprite: Phaser.Physics.Arcade.Sprite, intervalMs: number): void {
    const body = sprite.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) return;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < 75) return;
    const now = this.time.now;
    if (now < (this.iceMarkCooldown.get(sprite) ?? 0)) return;
    this.iceMarkCooldown.set(sprite, now + intervalMs);
    this.iceMarks.push({
      x: sprite.x - body.velocity.x / speed * 15,
      y: sprite.y - body.velocity.y / speed * 15,
      vx: body.velocity.x / speed, vy: body.velocity.y / speed,
      expires: now + 560,
    });
    if (this.iceMarks.length > 110) this.iceMarks.shift();
  }

  private renderIceTrails(): void {
    const g = this.iceTrailGraphics;
    if (!g) return;
    const now = this.time.now;
    if (now - this.lastIceTrailRender < 42) return;
    this.lastIceTrailRender = now;
    this.iceMarks = this.iceMarks.filter(mark => mark.expires > now);
    g.clear();
    for (const mark of this.iceMarks) {
      const alpha = Math.min(0.45, (mark.expires - now) / 560 * 0.45);
      g.lineStyle(2, 0x5a9cc0, alpha);
      g.lineBetween(mark.x - mark.vx * 9, mark.y - mark.vy * 9,
        mark.x + mark.vx * 5, mark.y + mark.vy * 5);
      g.fillStyle(0xffffff, alpha * 1.5);
      g.fillCircle(mark.x - mark.vy * 4, mark.y + mark.vx * 4, 2);
    }
  }

  private clearIceEffects(): void {
    this.iceMarks = [];
    this.iceMarkCooldown = new WeakMap();
    this.iceTrailGraphics?.clear();
    this.iceObstacleDecor?.destroy();
    this.iceObstacleDecor = undefined;
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
    // A light, cracked ice surface covers the entire world-2 floor.
    const ice = this.add.graphics();
    if (this.worldId === 2) drawFrozenFloor(ice, bounds, room.number);
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
    this.arenaArt = this.add.container(0, 0, [plate, floor, ice, motifs]).setDepth(0);
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

    this.clearBrambleCutscene();
    this.brambleCutsceneUsed = false;
    this.abilities?.cancelMotion();
    this.weapon?.clearGroundEffects();
    this.player?.clearFrost();
    this.clearBossBombs();
    this.clearCoins();
    this.clearIceEffects();
    this.witchSummons.clear();
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
    // Persist at the room boundary; resuming never claims the current fight
    // was cleared or awards coins for enemies that must be fought again.
    if (this.abilities) this.captureRoomCheckpoint();

    if (showBanner) {
      this.showRoomBanner(room);
    }
  }

  /** Every living ice witch attempts to call exactly two Snow Puffs each
   * five seconds. Both summons count toward clearing the chamber, and per-
   * witch / per-room live caps keep infinite fights and FPS spikes away.
   */
  private readonly summonFrostMinions = (witch: AdvancedEnemy): void => {
    if (!witch.isFrostWitch || witch.aiState === 'defeated' || !witch.active ||
      this.gameOver || this.transitioning || this.roomProgress.doorOpen ||
      !this.currentRoom || !this.player || !this.enemies || !this.enemySpawner) return;

    let owned = this.witchSummons.get(witch);
    if (!owned) { owned = new Set<Slime>(); this.witchSummons.set(witch, owned); }
    for (const summon of owned) {
      if (!summon.active || summon.aiState === 'defeated') owned.delete(summon);
    }
    const aliveSummons = this.enemies.getChildren().filter(child =>
      child instanceof Slime && child.active && child.aiState !== 'defeated' &&
      child.enemyId.startsWith('frost-summon-')).length;
    if (!canSummonFrostMinions(aliveSummons, owned.size, FROZEN_EARLY.witchSummonCount)) return;
    const layout = this.currentRoom.layout;
    const candidates: { x: number; y: number }[] = [];
    for (const range of [65, 105, 145]) {
      for (let i = 0; i < 8 && candidates.length < FROZEN_EARLY.witchSummonCount; i++) {
        const angle = i * Math.PI / 4 + this.time.now / 3900;
        const x = Phaser.Math.Clamp(witch.x + Math.cos(angle) * range,
          layout.bounds.x + 38, layout.bounds.x + layout.bounds.width - 38);
        const y = Phaser.Math.Clamp(witch.y + Math.sin(angle) * range,
          layout.bounds.y + 38, layout.bounds.y + layout.bounds.height - 38);
        if (Math.hypot(x - this.player.x, y - this.player.y) < 95 ||
          Math.hypot(x - witch.x, y - witch.y) < 35 ||
          layout.obstacles.some(o =>
            Math.abs(x - o.x) < o.width / 2 + 36 &&
            Math.abs(y - o.y) < o.height / 2 + 36) ||
          candidates.some(p => Math.hypot(p.x - x, p.y - y) < 54)) continue;
        candidates.push({ x, y });
      }
      if (candidates.length === FROZEN_EARLY.witchSummonCount) break;
    }
    if (candidates.length !== FROZEN_EARLY.witchSummonCount) return;

    this.roomProgress.addEnemies(candidates.length);
    const spawned = this.enemySpawner.summonSnowPuffs(candidates, this.currentRoom.number);
    for (const summon of spawned) owned.add(summon);
    for (const point of candidates) {
      const portal = this.add.circle(point.x, point.y, 25, 0x67e8f9, 0.28)
        .setStrokeStyle(3, 0xcffafe, 0.85).setDepth(16);
      this.tweens.add({ targets: portal, alpha: 0, scale: 1.6, duration: 460,
        onComplete: () => portal.destroy() });
    }
    this.updateEnemyCount();
  };

  private drawFrostStatus(): void {
    if (!this.player) return;
    const g = this.frostStatusVisual ??=
      this.add.graphics().setDepth(27);
    g.clear();
    if (!this.player.isFrozen && !this.player.isChilled) return;
    const x = this.player.x, y = this.player.y;
    const frozen = this.player.isFrozen;
    g.lineStyle(frozen ? 5 : 3, frozen ? 0xdafaff : 0x38bdf8, frozen ? 0.96 : 0.6);
    g.strokeCircle(x, y, frozen ? 31 : 26);
    g.fillStyle(0x67e8f9, frozen ? 0.22 : 0.09);
    g.fillCircle(x, y, frozen ? 30 : 25);
    if (frozen) {
      g.lineStyle(2, 0xffffff, 0.94);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        g.lineBetween(x + Math.cos(a) * 29, y + Math.sin(a) * 29,
          x + Math.cos(a) * 41, y + Math.sin(a) * 41);
      }
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
    // Summoners now own their first (350 ms) and repeated summon schedule.
    // Do not summon at room construction as well: that would duplicate the
    // Witch's first wave and violate the intended original cooldown.
    this.nextEnemyWaveAt = this.time.now + settings.intervalMs;
    return spawned;
  }

  private createObstacles(room: RoomDefinition): void {
    if (!this.obstacles) {
      return;
    }

    const world = getWorld(this.worldId);
    const snow = this.worldId === 2 ? this.add.graphics().setDepth(7) : undefined;
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
      if (snow) {
        snow.fillStyle(0xffffff, 0.88);
        snow.fillRoundedRect(definition.x - definition.width / 2 + 3,
          definition.y - definition.height / 2 + 3, definition.width - 6, 10, 4);
        snow.fillStyle(0xe0f7ff, 0.4);
        snow.fillEllipse(definition.x, definition.y + definition.height / 2 - 2,
          definition.width * 0.9, 10);
      }
    }
    this.iceObstacleDecor = snow;
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
      progressStore.dispatch({ type: 'reachRoom', worldId: this.worldId, room: nextRoomNumber });
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
    if (!projectile.registerHit(tank.enemyId)) {
      // A rotating Ancient Treant shield still blocks a bouncing Rune Tome
      // orb even if the orb originally locked on to the enemy behind it.
      if (!projectile.runeSecondHit) return;
    }
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
    const blocker = this.findProtectingTreant(projectileObject.shieldOrigin, targetObject);
    if (blocker) {
      this.hitTreantShield(projectileObject, blocker);
      return;
    }
    // Save this before registerHit: a second rune impact destroys the sprite.
    const runeSecond = projectileObject.runeSecondHit;
    if (!projectileObject.registerHit(targetObject.enemyId)) return;

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
    if (projectileObject.isRuneOrb) {
      this.showRuneImpact(targetObject.x,targetObject.y,runeSecond);
      if (projectileObject.runeAwaitingBounce) {
        const eligible=this.enemies?.getChildren()
          .filter((enemy): enemy is Slime => enemy instanceof Slime &&
            enemy.active && enemy.aiState!=='defeated' &&
            enemy.enemyId!==targetObject.enemyId &&
            !this.findProtectingTreant(targetObject,enemy))
          .map(enemy=>({enemyId:enemy.enemyId,x:enemy.x,y:enemy.y}))??[];
        const target=runeBounceTarget(targetObject,targetObject.enemyId,eligible);
        projectileObject.beginRuneBounce(target,this.time.now);
      }
    }
  };

  /** One short, contained hit flash on first and second impacts. */
  private showRuneImpact(x:number,y:number,second:boolean): void {
    const ring=this.add.circle(x,y,second?15:12,0xc084fc,0.18)
      .setStrokeStyle(2.5,0xf5d0fe,0.92).setDepth(30);
    const point=this.add.star(x,y,5,3,second?13:10,0xffffff,0.78).setDepth(31);
    this.tweens.add({targets:[ring,point],alpha:0,scale:1.65,
      duration:210,ease:'Sine.easeOut',
      onComplete:()=>{ring.destroy();point.destroy();}});
  }

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
    if (!this.player || !this.enemyProjectiles || this.gameOver || this.transitioning ||
      !enemy.active || enemy.aiState === 'defeated' || enemy.isStunned(this.time.now)) return;
    const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    // The two split Void Sentinels fire in opposite directions and rotate
    // twice as quickly as the original spiral. Keep other bosses unchanged.
    const angles = this.worldId === 1 && enemy.fasterTwin &&
      enemy.stats.roomNumber === 20
      ? [splitTwinShotAngle(amplifiedTwinVolleyIndex(volley), enemy.splitTwinIndex)]
      : shotAngles(pattern, angle, volley);
    const briarHunter = this.worldId === 1 && enemy.kind === 'archer';
    const emberFlame = this.worldId === 3 && enemy.kind === 'archer';
    const emberFireball = this.worldId === 3 && enemy.kind === 'mage';
    const emberBossProjectile = this.worldId === 3 && enemy.isBoss;
    const speed = (emberFlame ? EMBER_ATTACKS.flameProjectileSpeed :
      emberFireball ? EMBER_ATTACKS.fireballProjectileSpeed :
      enemy.kind === 'boss' ? (220 + getBossTier(enemy.stats.roomNumber) * 8) *
      (enemy.stats.roomNumber === 30 ? 1.25 : 1) :
      enemy.kind === 'mage' ? 220 : 320) * speedFactor *
      (briarHunter ? WORLD1_BRIAR_ARROW_SPEED_MULTIPLIER : 1);
    const frostArcher = this.worldId === 2 && enemy.kind === 'archer';
    const frostWitch = enemy.isFrostWitch;
    const effect = emberFlame ? 'ember-flame' :
      emberFireball || emberBossProjectile ? 'ember-fireball' :
      frostWitch ? 'frost-burst' : frostArcher ? 'frost-chill' :
      briarHunter ? 'briar-ricochet' : 'none';
    const color = frostWitch ? 0x93c5fd : frostArcher ? 0x38bdf8 :
      briarHunter ? 0xa3e635 :
      enemy.isBoss ? getBossProfile(enemy.stats.roomNumber, enemy.bossSlot, this.worldId).color :
      emberFlame ? 0xfbbf24 : emberFireball || emberBossProjectile ? 0xf97316 :
      enemy.kind === 'mage' ? 0xa78bfa : 0xfb7185;
    if (emberFlame || emberFireball || emberBossProjectile)
      this.showEmberMuzzle(enemy, angle, emberFireball || emberBossProjectile);
    for (const direction of angles) {
      const bullet = new EnemyProjectile(
        this, enemy.x + Math.cos(direction) * 30,
        enemy.y + Math.sin(direction) * 30,
        Math.cos(direction), Math.sin(direction),
        speed, enemy.stats.damage * (enemy.isBoss ? 0.57 :
          frostWitch ? FROZEN_EARLY.witchOrbDamageFactor :
          emberFlame ? EMBER_ATTACKS.flameDamageFactor : 1), color, effect,
      );
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

  private showEmberMuzzle(enemy: AdvancedEnemy, angle: number, fireball: boolean): void {
    const distance = fireball ? 26 : 31;
    const x = enemy.x + Math.cos(angle) * distance;
    const y = enemy.y + Math.sin(angle) * distance;
    const flare = this.add.star(x, y, fireball ? 8 : 6, 4,
      fireball ? 14 : 10, fireball ? 0xf97316 : 0xfde047, 0.92).setDepth(29);
    flare.setRotation(angle);
    this.tweens.add({ targets: flare, scale: 1.65, alpha: 0,
      duration: fireball ? 220 : 130, onComplete: () => flare.destroy() });
  }

  private readonly emberBossSpecial = (enemy: AdvancedEnemy, attack: EmberBossAttack,
    phase: 1 | 2, cycle: number): void => {
    if (this.worldId !== 3 || !this.player || !this.currentRoom ||
        this.gameOver || this.transitioning || this.roomProgress.doorOpen ||
        !enemy.active || enemy.aiState === 'defeated') return;
    if (attack === 'spinning-lasers') this.launchEmberLasers(enemy, phase, cycle);
    else if (attack === 'ground-fireball') this.launchGroundBurst(enemy, phase);
    else if (attack === 'edge-cannons') this.fireEdgeCannons(enemy, phase);
    else if (attack === 'lava-summon') this.summonLavaMonsters(enemy, phase);
    else if (attack === 'lava-geysers') this.launchLavaGeysers(enemy, phase);
    else if (attack === 'furnace-wave') this.launchFurnaceWave(enemy, phase, cycle);
  };

  private launchEmberLasers(enemy: AdvancedEnemy, phase: 1 | 2, cycle: number): void {
    const beam = this.add.graphics().setDepth(27);
    this.rootEffects.add(beam);
    const startAt = this.time.now;
    const direction = laserDirection(cycle);
    const duration = EMBER_BOSS_ATTACKS.laserDurationMs;
    const reach = Math.max(this.currentRoom?.layout.bounds.width ?? 700,
      this.currentRoom?.layout.bounds.height ?? 900);
    let nextDamageAt = startAt + EMBER_BOSS_ATTACKS.laserWarningMs;
    const totalTicks = Math.ceil(duration / 32);
    let ticks = 0;
    let timer: Phaser.Time.TimerEvent;
    const finish = (): void => {
      this.bombTimers.delete(timer);
      this.rootEffects.delete(beam);
      if (beam.active) beam.destroy();
    };
    timer = this.time.addEvent({ delay: 32, repeat: totalTicks - 1, callback: () => {
      ticks++;
      if (!beam.active || !enemy.active || enemy.aiState === 'defeated' ||
          this.roomProgress.doorOpen || this.gameOver || this.transitioning) {
        timer.remove(false); finish(); return;
      }
      const elapsed = this.time.now - startAt;
      const armed = elapsed >= EMBER_BOSS_ATTACKS.laserWarningMs;
      const angle = direction * elapsed * EMBER_BOSS_ATTACKS.laserAngularSpeed *
        (phase === 2 ? 1.3 : 1);
      beam.clear();
      for (const offset of [0, Math.PI / 2]) {
        const a = angle + offset;
        const ax = enemy.x - Math.cos(a) * reach, ay = enemy.y - Math.sin(a) * reach;
        const bx = enemy.x + Math.cos(a) * reach, by = enemy.y + Math.sin(a) * reach;
        beam.lineStyle(armed ? EMBER_BOSS_ATTACKS.laserWidth : 5,
          armed ? 0xf97316 : 0xfde047, armed ? 0.92 : 0.38);
        beam.lineBetween(ax, ay, bx, by);
        beam.lineStyle(armed ? 3 : 1, 0xfffbeb, armed ? 0.9 : 0.55);
        beam.lineBetween(ax, ay, bx, by);
        if (armed && this.player && this.time.now >= nextDamageAt &&
            pointToLaserDistance(this.player.x, this.player.y, ax, ay, bx, by) <=
              EMBER_BOSS_ATTACKS.laserWidth + 12) {
          nextDamageAt = this.time.now + 520;
          this.damagePlayer({ damage: enemy.stats.damage * 0.48,
            criticalChance: 0, criticalMultiplier: 1 });
        }
      }
      if (ticks >= totalTicks) finish();
    } });
    this.bombTimers.add(timer);
  }

  private launchGroundBurst(enemy: AdvancedEnemy, phase: 1 | 2): void {
    if (!this.player || !this.currentRoom) return;
    const bounds = this.currentRoom.layout.bounds;
    const targetX = Phaser.Math.Clamp(this.player.x, bounds.x + 45, bounds.x + bounds.width - 45);
    const targetY = Phaser.Math.Clamp(this.player.y, bounds.y + 45, bounds.y + bounds.height - 45);
    const warning = this.add.circle(targetX, targetY, 42, 0xef4444, 0.14)
      .setStrokeStyle(3, 0xfbbf24, 0.9).setDepth(24);
    const orb = this.add.circle(enemy.x, enemy.y - 18, phase === 2 ? 15 : 12, 0xf97316, 0.96)
      .setStrokeStyle(3, 0xfef08a).setDepth(31);
    this.bombWarnings.add(warning); this.bombWarnings.add(orb);
    const fromX = enemy.x, fromY = enemy.y - 18;
    this.tweens.addCounter({ from: 0, to: 1,
      duration: EMBER_BOSS_ATTACKS.groundFireballFlightMs, onUpdate: tween => {
        if (!orb.active) return;
        const t = tween.getValue() ?? 0;
        orb.setPosition(Phaser.Math.Linear(fromX, targetX, t),
          Phaser.Math.Linear(fromY, targetY, t) - 95 * Math.sin(Math.PI * t));
        orb.setScale(1 + 0.35 * Math.sin(Math.PI * t));
      }, onComplete: () => {
        this.bombWarnings.delete(warning); this.bombWarnings.delete(orb);
        warning.destroy(); orb.destroy();
        if (!enemy.active || enemy.aiState === 'defeated' || this.roomProgress.doorOpen) return;
        const blast = this.add.circle(targetX, targetY, 48, 0xf97316, 0.58)
          .setStrokeStyle(4, 0xffedd5).setDepth(30);
        this.tweens.add({ targets: blast, scale: 1.45, alpha: 0, duration: 330,
          onComplete: () => blast.destroy() });
        if (this.player && withinRadius(targetX, targetY, this.player.x, this.player.y, 48))
          this.damagePlayer({ damage: enemy.stats.damage * 0.62,
            criticalChance: 0, criticalMultiplier: 1 });
        const count = EMBER_BOSS_ATTACKS.groundBurstCount;
        for (let i = 0; i < count; i++) {
          const angle = i * Math.PI * 2 / count;
          this.launchEmberProjectile(targetX, targetY, Math.cos(angle), Math.sin(angle),
            EMBER_BOSS_ATTACKS.groundBurstSpeed, enemy.stats.damage * 0.34);
        }
      } });
  }

  private fireEdgeCannons(enemy: AdvancedEnemy, phase: 1 | 2): void {
    if (!this.currentRoom) return;
    const b = this.currentRoom.layout.bounds;
    const positions = phase === 1 ? [
      {x: b.x + 18, y: b.y + b.height * .35},
      {x: b.x + b.width - 18, y: b.y + b.height * .65},
    ] : [
      {x: b.x + 18, y: b.y + b.height * .3}, {x: b.x + b.width - 18, y: b.y + b.height * .7},
      {x: b.x + b.width * .3, y: b.y + 18}, {x: b.x + b.width * .7, y: b.y + b.height - 18},
    ];
    for (const [index, site] of positions.entries()) {
      const cannon = this.add.circle(site.x, site.y, 15, 0x292524, 1)
        .setStrokeStyle(4, 0xf97316).setDepth(29);
      const warning = this.add.graphics().setDepth(25);
      warning.lineStyle(3, 0xfbbf24, .5);
      warning.lineBetween(site.x, site.y,
        this.player?.x ?? site.x, this.player?.y ?? site.y);
      this.bombWarnings.add(cannon); this.rootEffects.add(warning);
      let timer: Phaser.Time.TimerEvent;
      timer = this.time.delayedCall(EMBER_BOSS_ATTACKS.cannonWarningMs + index * 90, () => {
        this.bombTimers.delete(timer); this.bombWarnings.delete(cannon);
        this.rootEffects.delete(warning); cannon.destroy(); warning.destroy();
        if (!this.player || !enemy.active || enemy.aiState === 'defeated' ||
            this.roomProgress.doorOpen || this.gameOver) return;
        const dx = this.player.x - site.x, dy = this.player.y - site.y;
        const length = Math.hypot(dx, dy) || 1;
        this.launchEmberProjectile(site.x, site.y, dx / length, dy / length,
          phase === 2 ? 365 : 320, enemy.stats.damage * 0.52);
      });
      this.bombTimers.add(timer);
    }
  }

  private summonLavaMonsters(enemy: AdvancedEnemy, phase: 1 | 2): void {
    if (!this.enemies || !this.enemySpawner || !this.currentRoom) return;
    const live = this.enemies.getChildren().filter(child => child instanceof Slime &&
      child.active && child.aiState !== 'defeated' && child.enemyId.startsWith('lava-summon-')).length;
    const available = Math.max(0, EMBER_BOSS_ATTACKS.lavaSummonCap - live);
    const count = Math.min(available, phase === 2 ? 2 : 1);
    if (count <= 0) return;
    const b = this.currentRoom.layout.bounds;
    const positions = Array.from({ length: count }, (_, i) => ({
      x: Phaser.Math.Clamp(enemy.x + (i === 0 ? -72 : 72), b.x + 40, b.x + b.width - 40),
      y: Phaser.Math.Clamp(enemy.y + 66, b.y + 40, b.y + b.height - 40),
    }));
    const portal = this.add.circle(enemy.x, enemy.y + 62, 28 + count * 5, 0xf97316, .4)
      .setStrokeStyle(4, 0xfde047).setDepth(24);
    this.tweens.add({ targets: portal, scale: 1.5, alpha: 0, duration: 520,
      onComplete: () => portal.destroy() });
    this.roomProgress.addEnemies(count);
    this.enemySpawner.summonLavaMonsters(positions, this.currentRoom.number);
  }

  private launchLavaGeysers(enemy: AdvancedEnemy, phase: 1 | 2): void {
    if (!this.player || !this.currentRoom) return;
    const b = this.currentRoom.layout.bounds;
    const count = phase === 2 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + this.time.now / 900;
      const distance = i === 0 ? 0 : 78;
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, b.x + 50, b.x + b.width - 50);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, b.y + 50, b.y + b.height - 50);
      const warning = this.add.circle(x, y, EMBER_BOSS_ATTACKS.geyserRadius, 0xef4444, .13)
        .setStrokeStyle(3, 0xfbbf24).setDepth(23);
      this.bombWarnings.add(warning);
      let timer: Phaser.Time.TimerEvent;
      timer = this.time.delayedCall(EMBER_BOSS_ATTACKS.geyserWarningMs + i * 70, () => {
        this.bombTimers.delete(timer); this.bombWarnings.delete(warning); warning.destroy();
        if (!enemy.active || enemy.aiState === 'defeated' || this.roomProgress.doorOpen) return;
        const column = this.add.rectangle(x, y - 50, 34, 120, 0xf97316, .78)
          .setStrokeStyle(3, 0xfef08a).setDepth(30).setOrigin(.5, 1);
        this.tweens.add({ targets: column, scaleY: {from: .15, to: 1.2}, alpha: 0,
          duration: 470, onComplete: () => column.destroy() });
        if (this.player && withinRadius(x, y, this.player.x, this.player.y,
          EMBER_BOSS_ATTACKS.geyserRadius))
          this.damagePlayer({ damage: enemy.stats.damage * .55,
            criticalChance: 0, criticalMultiplier: 1 });
      });
      this.bombTimers.add(timer);
    }
  }

  private launchFurnaceWave(enemy: AdvancedEnemy, phase: 1 | 2, cycle: number): void {
    const count = EMBER_BOSS_ATTACKS.furnaceWaveCount + (phase === 2 ? 4 : 0);
    const offset = cycle % 2 * Math.PI / count;
    const ring = this.add.circle(enemy.x, enemy.y, 24, 0xf97316, .35)
      .setStrokeStyle(5, 0xfde047).setDepth(29);
    this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 420,
      onComplete: () => ring.destroy() });
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + offset;
      this.launchEmberProjectile(enemy.x, enemy.y, Math.cos(angle), Math.sin(angle),
        phase === 2 ? 285 : 245, enemy.stats.damage * .38);
    }
  }

  private launchEmberProjectile(x: number, y: number, dx: number, dy: number,
    speed: number, damage: number, effect: EnemyProjectileEffect = 'ember-fireball'): void {
    if (!this.enemyProjectiles) return;
    const bullet = new EnemyProjectile(this, x, y, dx, dy, speed, damage, 0xf97316, effect);
    addAndLaunch(bullet, () => this.enemyProjectiles!.add(bullet), {x: dx, y: dy}, speed);
  }

  /** Exclusive World-2 bosses: growing rolling ice boulders, falling snow,
   * and bounded Golem reinforcements. All visual objects are cleaned on room exit. */
  private readonly frozenBossSpecial = (enemy: AdvancedEnemy,
    effect: 'boulder' | 'snow' | 'golems', count: number): void => {
    if (this.worldId !== 2 || !this.currentRoom || !this.player ||
        this.gameOver || this.transitioning || this.roomProgress.doorOpen ||
        !enemy.active || enemy.aiState === 'defeated') return;
    if (effect === 'boulder') this.chargeGlacierBoulder(enemy);
    else if (effect === 'snow') this.dropCeilingSnow(enemy);
    else this.summonSentinelGolems(enemy, count);
  };

  private chargeGlacierBoulder(enemy: AdvancedEnemy): void {
    if (!this.player || !this.currentRoom || this.glacierBoulders.size >= 3) return;
    const core = this.add.circle(0, 0, FROZEN_BALANCE.boulderRadius, 0x67e8f9, 1)
      .setStrokeStyle(4, 0xecfeff).setScale(.15);
    const spiral = this.add.arc(0, 0, 20, 0, 310, false, 0xcffafe, .65)
      .setStrokeStyle(3, 0xffffff, .7).setScale(.15);
    const glow = this.add.circle(0, 0, 40, 0x7dd3fc, .22).setScale(.15);
    const ball = this.add.container(enemy.x, enemy.y - 14, [glow, core, spiral]).setDepth(28);
    this.tweens.add({ targets: [core, spiral, glow], scale: 1,
      duration: FROZEN_BALANCE.boulderChargeMs, ease: 'Cubic.easeOut' });
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.delayedCall(FROZEN_BALANCE.boulderChargeMs, () => {
      this.bombTimers.delete(timer);
      if (!ball.active || !enemy.active || enemy.aiState === 'defeated' ||
        !this.player || this.gameOver || this.transitioning || this.roomProgress.doorOpen) {
        ball.destroy(); return;
      }
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const speed = FROZEN_BALANCE.boulderSpeed;
      this.glacierBoulders.add({ ball, x: ball.x, y: ball.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        owner: enemy, damage: enemy.stats.damage * 2.2 });
    });
    this.bombTimers.add(timer);
  }

  private updateGlacierBoulders(deltaMs: number): void {
    if (!this.currentRoom || !this.player) return;
    const bounds = this.currentRoom.layout.bounds;
    const radius = FROZEN_BALANCE.boulderRadius;
    for (const boulder of this.glacierBoulders) {
      const { ball, owner } = boulder;
      if (!ball.active || !owner.active || owner.aiState === 'defeated' ||
          this.roomProgress.doorOpen) {
        ball.destroy(); this.glacierBoulders.delete(boulder); continue;
      }
      const dt = Math.min(deltaMs, 50) / 1000;
      boulder.x += boulder.vx * dt;
      boulder.y += boulder.vy * dt;
      ball.setPosition(boulder.x, boulder.y);
      const spiral = ball.list[2];
      if (spiral instanceof Phaser.GameObjects.Arc) spiral.rotation += dt * 5;
      if (Math.hypot(this.player.x - boulder.x, this.player.y - boulder.y) < radius + 13) {
        this.damagePlayer({ damage: boulder.damage, criticalChance: 0, criticalMultiplier: 1 });
        this.shatterGlacierBoulder(boulder, false);
      } else {
        const hitsWall = boulder.x < bounds.x + radius || boulder.x > bounds.x + bounds.width - radius ||
          boulder.y < bounds.y + radius || boulder.y > bounds.y + bounds.height - radius;
        const hitsObstacle = this.currentRoom.layout.obstacles.some(obstacle =>
          Math.abs(boulder.x - obstacle.x) < obstacle.width / 2 + radius &&
          Math.abs(boulder.y - obstacle.y) < obstacle.height / 2 + radius);
        if (hitsWall || hitsObstacle) this.shatterGlacierBoulder(boulder, true);
      }
    }
  }

  private shatterGlacierBoulder(boulder: {
    ball: Phaser.GameObjects.Container; x: number; y: number;
    vx: number; vy: number; owner: AdvancedEnemy; damage: number;
  }, fragments: boolean): void {
    this.glacierBoulders.delete(boulder);
    boulder.ball.destroy();
    const flash = this.add.circle(boulder.x, boulder.y, 34, 0x93c5fd, .68)
      .setStrokeStyle(3, 0xecfeff).setDepth(30);
    this.tweens.add({ targets: flash, scale: 1.5, alpha: 0,
      duration: 320, onComplete: () => flash.destroy() });
    if (!fragments || !this.enemyProjectiles || !this.currentRoom || !this.player) return;
    const bounds = this.currentRoom.layout.bounds;
    // Fragments fan back into the arena, away from the wall impact.
    let center = Math.atan2(-boulder.vy, -boulder.vx);
    if (boulder.x <= bounds.x + FROZEN_BALANCE.boulderRadius) center = 0;
    else if (boulder.x >= bounds.x + bounds.width - FROZEN_BALANCE.boulderRadius) center = Math.PI;
    else if (boulder.y <= bounds.y + FROZEN_BALANCE.boulderRadius) center = Math.PI / 2;
    else if (boulder.y >= bounds.y + bounds.height - FROZEN_BALANCE.boulderRadius) center = -Math.PI / 2;
    for (let i = 0; i < FROZEN_BALANCE.snowballWallFragments; i++) {
      const angle = center + (i - 2) * .25;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const shot = new EnemyProjectile(this, boulder.x + dx * 36, boulder.y + dy * 36, dx, dy, 245,
        boulder.owner.stats.damage * .65, 0xcffafe, 'frost-chill');
      addAndLaunch(shot, () => this.enemyProjectiles!.add(shot), { x: dx, y: dy }, 245);
    }
  }

  private dropCeilingSnow(enemy: AdvancedEnemy): void {
    if (!this.currentRoom || !this.player || this.fallingSnowballs.size >= 18) return;
    const bounds = this.currentRoom.layout.bounds;
    const radius = FROZEN_BALANCE.snowFallRadius;
    const x = Phaser.Math.Between(Math.ceil(bounds.x + radius + 8),
      Math.floor(bounds.x + bounds.width - radius - 8));
    const y = Phaser.Math.Between(Math.ceil(bounds.y + radius + 8),
      Math.floor(bounds.y + bounds.height - radius - 8));
    const shadow = this.add.ellipse(0, 0, radius * 2.2, radius * 1.1,
      0x020617, .34).setScale(.25);
    const ball = this.add.circle(0, -190, 11, 0xe0f2fe, 1)
      .setStrokeStyle(3, 0x38bdf8);
    const shine = this.add.circle(-3, -194, 3, 0xffffff, .9);
    const falling = this.add.container(x, y, [shadow, ball, shine]).setDepth(27);
    this.fallingSnowballs.add(falling);
    this.tweens.add({ targets: shadow, scale: 1,
      duration: FROZEN_BALANCE.snowFallDurationMs, ease: 'Linear' });
    this.tweens.add({ targets: [ball, shine], y: 0,
      duration: FROZEN_BALANCE.snowFallDurationMs, ease: 'Cubic.easeIn',
      onComplete: () => {
        if (!falling.active) return;
        this.fallingSnowballs.delete(falling);
        falling.destroy();
        const puff = this.add.circle(x, y, radius, 0xcffafe, .55)
          .setStrokeStyle(2, 0xffffff).setDepth(30);
        this.tweens.add({ targets: puff, alpha: 0, scale: 1.5,
          duration: 230, onComplete: () => puff.destroy() });
        if (!this.gameOver && !this.transitioning && !this.roomProgress.doorOpen &&
            enemy.active && enemy.aiState !== 'defeated' && this.player &&
            Math.hypot(this.player.x - x, this.player.y - y) < radius + 10)
          this.damagePlayer({ damage: enemy.stats.damage * .65,
            criticalChance: 0, criticalMultiplier: 1 });
      },
    });
  }

  private summonSentinelGolems(enemy: AdvancedEnemy, count: number): void {
    if (!this.currentRoom || !this.enemySpawner || !this.enemies || !this.player ||
        !enemy.isSnowSentinel) return;
    const alive = this.enemies.getChildren().filter(child =>
      child instanceof AdvancedEnemy && child.active && child.aiState !== 'defeated' &&
      child.enemyId.startsWith('sentinel-golem-')).length;
    const toSpawn = Math.min(count, FROZEN_BALANCE.sentinelMaxActiveGolems - alive);
    if (toSpawn <= 0) return;
    const bounds = this.currentRoom.layout.bounds;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 40 && points.length < toSpawn; i++) {
      const angle = (i * 2.399963 + this.time.now / 4000);
      const distance = 100 + (i % 3) * 55;
      const x = Phaser.Math.Clamp(enemy.x + Math.cos(angle) * distance,
        bounds.x + 40, bounds.x + bounds.width - 40);
      const y = Phaser.Math.Clamp(enemy.y + Math.sin(angle) * distance,
        bounds.y + 40, bounds.y + bounds.height - 40);
      if (Math.hypot(x - this.player.x, y - this.player.y) < 110 ||
        this.currentRoom.layout.obstacles.some(o =>
          Math.abs(o.x - x) < o.width / 2 + 35 && Math.abs(o.y - y) < o.height / 2 + 35) ||
        points.some(p => Math.hypot(p.x - x, p.y - y) < 55)) continue;
      points.push({ x, y });
    }
    if (!points.length) return;
    this.roomProgress.addEnemies(points.length);
    this.enemySpawner.summonGlacierGolems(points, this.currentRoom.number);
    this.updateEnemyCount();
    for (const point of points) {
      const portal = this.add.circle(point.x, point.y, 30, 0x7dd3fc, .38)
        .setStrokeStyle(3, 0xe0f2fe, .9).setDepth(22);
      this.tweens.add({ targets: portal, alpha: 0, scale: 1.6,
        duration: 450, onComplete: () => portal.destroy() });
    }
  }

  /** Blizzard Tyrant's frosty seeker pursues the player's *current* position
   * for at most eight seconds and obeys normal projectile hit/slow rules.
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

  /** Growing underground root wave and three rotating eight-way barrages. */
  private readonly performRootAttack = (enemy: AdvancedEnemy, attack: 'line' | 'burst',
    targetX: number, targetY: number, rotation: number | boolean): void => {
    if (!this.currentRoom || this.gameOver || this.transitioning || this.roomProgress.doorOpen) return;
    const bounds = this.currentRoom.layout.bounds;
    const origin = {x: enemy.x, y: enemy.y};
    const aim = Math.atan2(targetY - origin.y, targetX - origin.x);
    const angles = attack === 'burst' ? rootBurstAngles(rotation) : [aim];
    const warningMs = attack === 'line' ? ROOT_BRANCH.lineWarningMs : ROOT_BRANCH.burstWarningMs;
    const growMs = attack === 'line' ? 660 : 460;
    for (const angle of angles) {
      const length = attack === 'burst' ? ROOT_BRANCH.burstLength :
        Math.max(390, Math.hypot(targetX - origin.x, targetY - origin.y) + 95);
      const end = {
        x: Phaser.Math.Clamp(origin.x + Math.cos(angle) * length,
          bounds.x + 12, bounds.x + bounds.width - 12),
        y: Phaser.Math.Clamp(origin.y + Math.sin(angle) * length,
          bounds.y + 12, bounds.y + bounds.height - 12),
      };
      // Fissures warn the player where a root is about to surface; this is
      // purely a telegraph and never deals damage.
      const preview = this.add.graphics().setDepth(24);
      this.rootEffects.add(preview);
      preview.lineStyle(2, 0xd9f99d, 0.84);
      const segments = 18;
      for (let j = 0; j < segments; j += 2) {
        const a = rootWavePoint(origin, end, j / segments);
        const b = rootWavePoint(origin, end, (j + 1) / segments);
        preview.lineBetween(a.x, a.y, b.x, b.y);
      }
      preview.lineStyle(4, 0x65a30d, 0.30);
      preview.strokeCircle(origin.x, origin.y, 22);
      const sprout = this.add.graphics().setDepth(27);
      this.rootEffects.add(sprout);
      sprout.fillStyle(0x5b3a1a, 0.93);
      sprout.fillEllipse(origin.x, origin.y, 18, 8);
      sprout.lineStyle(2, 0xa3e635, 0.76);
      sprout.lineBetween(origin.x - 5, origin.y, origin.x + 3, origin.y - 17);
      let timer: Phaser.Time.TimerEvent;
      timer = this.time.delayedCall(warningMs, () => {
        this.bombTimers.delete(timer);
        this.rootEffects.delete(preview);
        this.rootEffects.delete(sprout);
        preview.destroy();
        sprout.destroy();
        if (!enemy.active || enemy.aiState === 'defeated' || this.gameOver ||
            this.transitioning || this.roomProgress.doorOpen || this.choosingUpgrade) return;
        const growth = this.add.graphics().setDepth(28);
        this.rootEffects.add(growth);
        let previousProgress = 0;
        let damaged = false;
        this.tweens.addCounter({
          from: 0, to: 1, duration: growMs, ease: 'Linear',
          onUpdate: tween => {
            if (!growth.active || this.roomProgress.doorOpen || this.gameOver ||
                this.transitioning || this.choosingUpgrade) return;
            const t = tween.getValue() ?? 0;
            const totalSegments = Math.max(1, Math.ceil(t * 32));
            const points: {x: number; y: number}[] = [];
            for (let i = 0; i <= totalSegments; i++)
              points.push(rootWavePoint(origin, end, t * i / totalSegments));
            growth.clear();
            growth.lineStyle(18, 0x5c381c, 1);
            for (let i = 1; i < points.length; i++) {
              growth.lineBetween(points[i - 1]!.x, points[i - 1]!.y,
                points[i]!.x, points[i]!.y);
            }
            growth.lineStyle(9, 0x8ba246, 1);
            for (let i = 1; i < points.length; i++) {
              growth.lineBetween(points[i - 1]!.x, points[i - 1]!.y,
                points[i]!.x, points[i]!.y);
            }
            // Side roots emerge progressively, never pre-rendered ahead of the tip.
            for (let fraction = 0.14; fraction <= t; fraction += 0.14) {
              const p = rootWavePoint(origin, end, fraction);
              const dir = angle + (Math.floor(fraction * 100) % 2 ? 1 : -1) * 0.8;
              growth.lineStyle(4, 0x6d4c23, 0.9);
              growth.lineBetween(p.x, p.y, p.x + Math.cos(dir) * 17,
                p.y + Math.sin(dir) * 17);
            }
            const tip = rootWavePoint(origin, end, t);
            growth.fillStyle(0xc2e98b, 0.92);
            growth.fillCircle(tip.x, tip.y, 11);
            // Damage travels with the leading tip, NOT instantly along the
            // full line. Substeps prevent skipped collisions at low mobile FPS.
            if (!damaged && this.player?.active && enemy.active &&
                enemy.aiState !== 'defeated') {
              const slices = Math.max(1, Math.ceil((t - previousProgress) * 60));
              for (let step = 0; step < slices; step++) {
                const a = rootWavePoint(origin, end,
                  previousProgress + (t - previousProgress) * step / slices);
                const b = rootWavePoint(origin, end,
                  previousProgress + (t - previousProgress) * (step + 1) / slices);
                if (rootTipHits(a, b, this.player, ROOT_BRANCH.lineWidth / 2 + 13)) {
                  damaged = true;
                  this.damagePlayer({damage: enemy.stats.damage * .62,
                    criticalChance: 0, criticalMultiplier: 1});
                  break;
                }
              }
            }
            previousProgress = t;
          },
          onComplete: () => {
            if (!growth.active) return;
            this.tweens.add({ targets: growth, alpha: 0, duration: 180,
              onComplete: () => {
                this.rootEffects.delete(growth);
                growth.destroy();
              } });
          },
        });
      });
      this.bombTimers.add(timer);
    }
  };

  /** Moss Warden phase-two dash drops animated explosive seed-bombs. */
  private readonly dropDashTrailBomb = (enemy: AdvancedEnemy, x: number, y: number): void => {
    if (this.gameOver || this.transitioning || this.roomProgress.doorOpen) return;
    if (this.worldId === 3 && enemy.isBlazehound) {
      this.createBlazehoundTrail(enemy, x, y);
      return;
    }
    const seed = this.add.circle(x, y, 9, 0x92400e, 1)
      .setStrokeStyle(2, 0xfde68a).setDepth(27);
    const fuse = this.add.circle(x + 2, y - 10, 3, 0xf97316, 1).setDepth(28);
    const warning = this.add.circle(x, y, MOSS_DASH.trailRadius, 0xef4444, .11)
      .setStrokeStyle(2, 0xfb923c, .82).setDepth(24);
    this.bombWarnings.add(seed);
    this.bombWarnings.add(fuse);
    this.bombWarnings.add(warning);
    this.tweens.add({ targets: seed, scale: 1.35, yoyo: true, repeat: 2,
      duration: MOSS_DASH.trailFuseMs / 6 });
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.delayedCall(MOSS_DASH.trailFuseMs, () => {
      this.bombTimers.delete(timer);
      for (const graphic of [seed, fuse, warning]) {
        this.bombWarnings.delete(graphic);
        graphic.destroy();
      }
      if (this.gameOver || this.transitioning || this.roomProgress.doorOpen ||
        !enemy.active || enemy.aiState === 'defeated') return;
      const flash = this.add.circle(x, y, MOSS_DASH.trailRadius, 0xf97316, .66)
        .setStrokeStyle(3, 0xfef08a).setDepth(31);
      this.tweens.add({ targets: flash, alpha: 0, scale: 1.4, duration: 330,
        onComplete: () => flash.destroy() });
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const ember = this.add.circle(x, y, 3, 0xfbbf24).setDepth(32);
        this.tweens.add({ targets: ember, x: x + Math.cos(a) * 35,
          y: y + Math.sin(a) * 35, alpha: 0, duration: 340,
          onComplete: () => ember.destroy() });
      }
      if (this.player && withinRadius(x, y, this.player.x, this.player.y,
        MOSS_DASH.trailRadius))
        this.damagePlayer({ damage: enemy.stats.damage * .5,
          criticalChance: 0, criticalMultiplier: 1 });
    });
    this.bombTimers.add(timer);
  };

  private createBlazehoundTrail(enemy: AdvancedEnemy, x: number, y: number): void {
    const patch = this.add.circle(x, y, EMBER_ATTACKS.houndTrailRadius, 0xef4444, 0.22)
      .setStrokeStyle(2, 0xf97316, 0.78).setDepth(21);
    const core = this.add.circle(x, y, EMBER_ATTACKS.houndTrailRadius * 0.52,
      0xfbbf24, 0.28).setDepth(22);
    this.bombWarnings.add(patch);
    this.bombWarnings.add(core);
    this.tweens.add({ targets: [patch, core], scaleX: 1.12, scaleY: 0.88,
      alpha: 0.12, duration: 190, yoyo: true, repeat: -1 });
    let nextDamageAt = this.time.now;
    let ticks = 0;
    const totalTicks = Math.ceil(EMBER_ATTACKS.houndTrailDurationMs / 100);
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.addEvent({ delay: 100,
      repeat: totalTicks - 1,
      callback: () => {
        ticks++;
        if (!patch.active || this.roomProgress.doorOpen || this.gameOver || this.transitioning) {
          timer.remove(false);
        } else if (this.player && this.time.now >= nextDamageAt &&
            withinRadius(x, y, this.player.x, this.player.y, EMBER_ATTACKS.houndTrailRadius)) {
          nextDamageAt = this.time.now + 650;
          this.damagePlayer({ damage: enemy.stats.damage * EMBER_ATTACKS.houndTrailDamageFactor,
            criticalChance: 0, criticalMultiplier: 1 });
        }
        if (ticks < totalTicks && patch.active && !this.roomProgress.doorOpen &&
            !this.gameOver && !this.transitioning) return;
        this.bombTimers.delete(timer);
        for (const flame of [patch, core]) {
          this.bombWarnings.delete(flame);
          if (flame.active) flame.destroy();
        }
      },
      callbackScope: this,
    });
    this.bombTimers.add(timer);
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
      this.throwPoisonBottles(enemy, count, radius);
      return;
    }
    if (enemy.isHeartOfGrove) {
      this.growHeartTrees(enemy, targetX, targetY, count, radius, windupMs);
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
      timer = this.time.delayedCall(windupMs + (enemy.isBoss && enemy.stats.roomNumber === 30 ? 200 : 0), () => {
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

  /** Existing Jade projectiles stay untouched. Every independent cycle adds
   * exactly two warning corridors and living branches crossing the arena. */
  private readonly performJadeBranches = (enemy: AdvancedEnemy): void => {
    if (this.worldId !== 1 || !enemy.isJadeMatriarch || !this.currentRoom ||
        this.gameOver || this.transitioning || this.roomProgress.doorOpen ||
        this.choosingUpgrade) return;
    const lanes = jadeBranchLanes(this.currentRoom.layout.bounds, Math.random);
    for (const lane of lanes) {
      const telegraph = this.add.graphics().setDepth(24);
      this.rootEffects.add(telegraph);
      const dx = lane.end.x-lane.start.x, dy = lane.end.y-lane.start.y;
      const length = Math.hypot(dx,dy);
      const nx = length > 0 ? -dy/length : 0, ny = length > 0 ? dx/length : 0;
      telegraph.fillStyle(0xc4b5fd,0.15);
      telegraph.fillTriangle(lane.start.x+nx*20,lane.start.y+ny*20,
        lane.end.x+nx*20,lane.end.y+ny*20,
        lane.end.x-nx*20,lane.end.y-ny*20);
      telegraph.fillTriangle(lane.start.x+nx*20,lane.start.y+ny*20,
        lane.start.x-nx*20,lane.start.y-ny*20,
        lane.end.x-nx*20,lane.end.y-ny*20);
      // Dotted warning remains visible for the full preparation time.
      telegraph.lineStyle(3,0xe9d5ff,0.96);
      for (let i=0;i<18;i+=2){
        const a=groveBranchTip(lane,i/18), b=groveBranchTip(lane,(i+1)/18);
        telegraph.lineBetween(a.x,a.y,b.x,b.y);
      }
      let timer: Phaser.Time.TimerEvent;
      timer = this.time.delayedCall(JADE_BRANCH.warningMs,() => {
        this.bombTimers.delete(timer);
        this.rootEffects.delete(telegraph);
        telegraph.destroy();
        if (!enemy.active || enemy.aiState==='defeated' || this.gameOver ||
            this.transitioning || this.roomProgress.doorOpen || this.choosingUpgrade) return;
        const now=this.time.now;
        const graphic=this.add.graphics().setDepth(28);
        this.jadeBranches.add({lane,graphic,owner:enemy,
          startsAt:now, expiresAt:now+JADE_BRANCH.growthMs+JADE_BRANCH.activeMs,
          nextHitAt:now});
      });
      this.bombTimers.add(timer);
    }
  };

  private updateJadeBranches(now: number): void {
    for (const active of this.jadeBranches) {
      const {graphic,lane,owner}=active;
      if (!graphic.active || now>=active.expiresAt || !owner.active ||
          owner.aiState==='defeated' || this.roomProgress.doorOpen ||
          this.gameOver || this.transitioning) {
        graphic.destroy();
        this.jadeBranches.delete(active);
        continue;
      }
      const t=Math.min(1,Math.max(0,(now-active.startsAt)/JADE_BRANCH.growthMs));
      const tip=groveBranchTip(lane,t);
      graphic.clear();
      // All side shoots emerge only on the already visible part of the branch.
      graphic.lineStyle(JADE_BRANCH.thickness,0x694122,0.96);
      graphic.lineBetween(lane.start.x,lane.start.y,tip.x,tip.y);
      graphic.lineStyle(7,0xa5be74,0.95);
      graphic.lineBetween(lane.start.x,lane.start.y,tip.x,tip.y);
      for(let fraction=0.1;fraction<=t;fraction+=0.115){
        const p=groveBranchTip(lane,fraction);
        const direction=(Math.floor(fraction*100)%2?1:-1);
        const along=lane.orientation==='horizontal';
        graphic.lineStyle(5,0x6f4827,1);
        graphic.lineBetween(p.x,p.y,p.x+(along?0:direction*22),
          p.y+(along?direction*22:0));
        graphic.fillStyle(0x86b96a,0.83);
        graphic.fillEllipse(p.x+(along?0:direction*22),
          p.y+(along?direction*22:0),12,9);
      }
      graphic.fillStyle(0xd9f99d,0.94);
      graphic.fillCircle(tip.x,tip.y,12);
      if (now>=active.nextHitAt && this.player?.active &&
          groveBranchHits(lane,t,this.player)) {
        active.nextHitAt=now+JADE_BRANCH.hitCooldownMs;
        this.damagePlayer({damage:owner.stats.damage*0.62,
          criticalChance:0,criticalMultiplier:1});
      }
    }
  }

  /** Heart of the Grove: replace its old orange blast circles with marked
   * tree growth. Reserve each footprint before the windup to avoid ALL overlaps. */
  private growHeartTrees(enemy: AdvancedEnemy, targetX: number, targetY: number,
    count: number, radius: number, windupMs: number): void {
    if (this.worldId!==1 || !enemy.isHeartOfGrove || !this.currentRoom ||
        this.gameOver || this.transitioning || this.roomProgress.doorOpen) return;
    const reserved=Array.from(this.groveTreeZones,zone=>zone.site);
    const sites=selectPoisonLocations(count,radius,this.currentRoom.layout.bounds,
      reserved,Math.random,{x:targetX,y:targetY});
    for (const site of sites) {
      const graphic=this.add.graphics().setDepth(28);
      const zone={site,graphic};
      this.groveTreeZones.add(zone);
      const {x,y}=site;
      const r=site.radius;
      graphic.fillStyle(0x78350f,0.15).fillCircle(x,y,r);
      graphic.lineStyle(3,0xfde68a,0.92).strokeCircle(x,y,r);
      graphic.lineStyle(2,0x78350f,0.88);
      for (let j=0;j<8;j++) {
        const a=j*Math.PI/4,inner=r*0.14,outer=r*0.72;
        graphic.lineBetween(x+Math.cos(a)*inner,y+Math.sin(a)*inner,
          x+Math.cos(a+0.13)*outer,y+Math.sin(a+0.13)*outer);
      }
      let warningTimer: Phaser.Time.TimerEvent;
      warningTimer=this.time.delayedCall(windupMs+HEART_TREE.warningExtraMs,()=>{
        this.bombTimers.delete(warningTimer);
        if (!graphic.active || !enemy.active || enemy.aiState==='defeated' ||
            this.gameOver || this.transitioning || this.choosingUpgrade ||
            this.roomProgress.doorOpen) {
          graphic.destroy();
          this.groveTreeZones.delete(zone);
          return;
        }
        let hit=false;
        this.tweens.addCounter({
          from:0,to:1,duration:HEART_TREE.growthMs,ease:'Cubic.easeOut',
          onUpdate:tween=>{
            if (!graphic.active || this.gameOver || this.transitioning ||
                this.roomProgress.doorOpen) return;
            const t=tween.getValue()??0;
            graphic.clear();
            // Roots radiate to the entire warned circumference, matching
            // the true circular hitbox exactly.
            graphic.fillStyle(0x3f6212,0.11*t).fillCircle(x,y,r*t);
            graphic.lineStyle(3,0x854d0e,0.8);
            for(let i=0;i<9;i++){
              const a=i*Math.PI*2/9,dist=r*t;
              graphic.lineBetween(x,y,x+Math.cos(a)*dist,
                y+Math.sin(a)*dist);
            }
            const height=r*1.22*t;
            graphic.lineStyle(Math.max(5,r*0.24*t),0x754424,1);
            graphic.lineBetween(x,y+8,x,y-height);
            graphic.lineStyle(3,0xb98d53,0.82);
            graphic.lineBetween(x-3,y+3,x-3,y-height);
            graphic.fillStyle(0x65a30d,0.83);
            graphic.fillEllipse(x,y-height*0.77,r*1.45*t,r*0.95*t);
            graphic.fillStyle(0xbef264,0.6);
            graphic.fillEllipse(x-r*0.13,y-height*0.92,r*0.7*t,r*0.35*t);
            // The first damage frame matches the visible expanding roots.
            if (!hit && t>=HEART_TREE.damageAtProgress &&
                this.player?.active && enemy.active &&
                enemy.aiState!=='defeated' &&
                groveTreeHits(site,r*t,this.player)) {
              hit=true;
              this.damagePlayer({damage:enemy.stats.damage*0.62,
                criticalChance:0,criticalMultiplier:1});
            }
          },
          onComplete:()=>{
            if (!graphic.active) return;
            let holdTimer: Phaser.Time.TimerEvent;
            holdTimer=this.time.delayedCall(HEART_TREE.holdMs,()=>{
              this.bombTimers.delete(holdTimer);
              if (!graphic.active) return;
              this.tweens.add({targets:graphic,alpha:0,
                duration:HEART_TREE.fadeMs,
                onComplete:()=>{
                  graphic.destroy();
                  this.groveTreeZones.delete(zone);
                }});
            });
            this.bombTimers.add(holdTimer);
          },
        });
      });
      this.bombTimers.add(warningTimer);
    }
  }

  private clearGroveEffects(): void {
    for(const branch of this.jadeBranches) {
      if(branch.graphic.active)branch.graphic.destroy();
    }
    this.jadeBranches.clear();
    for(const zone of this.groveTreeZones) {
      this.tweens.killTweensOf(zone.graphic);
      if(zone.graphic.active)zone.graphic.destroy();
    }
    this.groveTreeZones.clear();
  }

  /** The long-range ice bomb visibly flies to its target before leaving a slow field. */
  private throwFrozenSlowBomb(enemy: AdvancedEnemy, targetX: number, targetY: number,
    radius: number, windupMs: number): void {
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    const x = Phaser.Math.Clamp(targetX, bounds.x + radius, bounds.x + bounds.width - radius);
    const y = Phaser.Math.Clamp(targetY, bounds.y + radius, bounds.y + bounds.height - radius);
    const bomb = this.add.circle(enemy.x, enemy.y, 11, 0x67e8f9, 0.95)
      .setStrokeStyle(3, 0xffffff).setDepth(30);
    const target = this.add.circle(x, y, radius, 0x67e8f9, 0.12)
      .setStrokeStyle(2, 0xbae6fd, 0.75).setDepth(24);
    this.bombWarnings.add(bomb);
    this.bombWarnings.add(target);
    const startY = enemy.y;
    this.tweens.add({
      targets: bomb, x, y, duration: windupMs, ease: 'Linear',
      onUpdate: tween => bomb.setY(Phaser.Math.Linear(startY, y, tween.progress) -
        75 * Math.sin(Math.PI * tween.progress)),
      onComplete: () => {
        this.bombWarnings.delete(bomb);
        this.bombWarnings.delete(target);
        bomb.destroy();
        target.destroy();
        if (this.gameOver || this.transitioning || this.roomProgress.doorOpen) return;
        const patch = this.add.circle(x, y, radius, 0x7dd3fc, 0.28)
          .setStrokeStyle(2, 0xbae6fd, 0.75).setDepth(22);
        this.bombWarnings.add(patch);
        let damageAt = 0;
        let ticks = 0;
        const timer = this.time.addEvent({ delay: 100, repeat: 24, callback: () => {
          ticks++;
          if (patch.active && this.player && !this.roomProgress.doorOpen &&
              withinRadius(x, y, this.player.x, this.player.y, radius)) {
            this.player.chill(this.time.now);
            if (this.time.now >= damageAt) {
              damageAt = this.time.now + 850;
              this.damagePlayer({ damage: enemy.stats.damage * 0.23,
                criticalChance: 0, criticalMultiplier: 1 });
            }
          }
          if (ticks >= 25) {
            this.bombWarnings.delete(patch);
            patch.destroy();
            this.bombTimers.delete(timer);
          }
        } });
        this.bombTimers.add(timer);
      },
    });
  }

  /** Each green bottle visibly arcs from the alchemist to its target before
   * breaking. Impact creates a 1.5-second damaging poison circle.
   */
  private throwPoisonBottles(enemy: AdvancedEnemy, count: number, radius: number): void {
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    const occupied = [
      ...Array.from(this.poisonPools, p => ({x: p.x, y: p.y, radius: p.radius})),
      ...this.poisonReservations,
    ];
    const sites = selectPoisonLocations(count, radius, bounds, occupied, Math.random,
      this.player ? {x: this.player.x, y: this.player.y} : undefined);
    // Less is better than overlapping. All in-flight bottles are reserved before
    // any next cast, and each new active pool occupies the same location.
    for (const [i, site] of sites.entries()) {
      const {x, y} = site;
      this.poisonReservations.add(site);
      const marker = this.add.circle(x, y, radius, 0x4ade80, 0.14)
        .setStrokeStyle(2, 0xa3e635, 0.85).setDepth(25);
      this.bombWarnings.add(marker);
      const warningTween = this.tweens.add({
        targets: marker, alpha: {from: 0.9, to: 0.4}, scale: {from: 0.86, to: 1},
        duration: SPORE_POISON.bottleFlightMs + i * 55, ease: 'Sine.easeInOut',
      });
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
          this.poisonReservations.delete(site);
          if (!bottle.active) return;
          this.poisonBottles.delete(bottle);
          this.bombWarnings.delete(marker);
          warningTween.stop();
          marker.destroy();
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
      this.damagePlayer({ damage: pool.damage, criticalChance: 0, criticalMultiplier: 1 });
    }
  }

  private clearBossBombs(): void {
    for (const timer of this.bombTimers) timer.remove(false);
    this.bombTimers.clear();
    this.clearGroveEffects();
    for (const warning of this.bombWarnings) if (warning.active) warning.destroy();
    for (const root of this.rootEffects) if (root.active) root.destroy();
    this.rootEffects.clear();
    this.bombWarnings.clear();
    this.clearFrozenWalls();
    for (const boulder of this.glacierBoulders) boulder.ball.destroy();
    this.glacierBoulders.clear();
    for (const snow of this.fallingSnowballs) snow.destroy();
    this.fallingSnowballs.clear();
    for (const bottle of this.poisonBottles) {
      this.tweens.killTweensOf(bottle);
      bottle.destroy();
    }
    this.poisonBottles.clear();
    this.poisonReservations.clear();
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

  /** The Frost Witch's orb bursts both on the hero and arena obstacles.
   * AoE damage is resolved once; vulnerable heroes are slowed, never frozen.
   */
  private explodeFrostBolt(x: number, y: number, attack: Readonly<Projectile['attack']>): void {
    const radius = FROZEN_EARLY.witchOrbRadius;
    const blast = this.add.circle(x, y, radius, 0x67e8f9, 0.28)
      .setStrokeStyle(5, 0xe0f2fe, 0.98).setDepth(30);
    const crystal = this.add.circle(x, y, radius * 0.42, 0xcffafe, 0.42)
      .setStrokeStyle(2, 0xffffff, 0.9).setDepth(31);
    this.tweens.add({ targets: [blast, crystal], alpha: 0, scale: 1.2, duration: 300,
      onComplete: () => { blast.destroy(); crystal.destroy(); } });
    if (!this.player || this.gameOver || this.transitioning ||
      !withinRadius(x, y, this.player.x, this.player.y, radius)) return;
    const vulnerable = this.player.canReceiveContactDamage(this.time.now);
    this.damagePlayer(attack);
    if (vulnerable && !this.gameOver) this.player.slowFromWitch(this.time.now);
  }

  private readonly handleEnemyBulletHit = (
    playerObject: ArcadeCollisionObject,
    bulletObject: ArcadeCollisionObject,
  ): void => {
    if (!(playerObject instanceof Player) || !(bulletObject instanceof EnemyProjectile) ||
        !bulletObject.active) return;
    // Consume each projectile once on overlap; all separate bullets can damage.
    const attack = bulletObject.attack;
    const effect = bulletObject.effect;
    const x = bulletObject.x, y = bulletObject.y;
    bulletObject.destroy();
    if (effect === 'frost-burst') {
      this.explodeFrostBolt(x, y, attack);
    } else {
      const susceptible = playerObject.canReceiveContactDamage(this.time.now);
      this.damagePlayer(attack);
      if (effect === 'frost-chill' && susceptible && !this.gameOver)
        playerObject.chill(this.time.now);
    }
  };

  /** Small, short-lived spark when a Briar arrow reflects off a wall. */
  private showBriarRicochet(x: number, y: number): void {
    const spark = this.add.circle(x, y, 8, 0xd9f99d, 0.65)
      .setStrokeStyle(2, 0x65a30d, 0.92).setDepth(22);
    this.tweens.add({
      targets: spark, scale: 1.6, alpha: 0, duration: 185,
      onComplete: () => spark.destroy(),
    });
  }

  private readonly handleEnemyBulletObstacle = (
    projectileObject: ArcadeCollisionObject,
    obstacleObject: ArcadeCollisionObject,
  ): void => {
    if (!(projectileObject instanceof EnemyProjectile) || !projectileObject.active) return;
    if (projectileObject.effect === 'briar-ricochet') {
      const body = projectileObject.body;
      const touch = body instanceof Phaser.Physics.Arcade.Body ? body.touching : {};
      const obstacle = obstacleObject instanceof Phaser.GameObjects.Rectangle
        ? { x: obstacleObject.x, y: obstacleObject.y,
          width: obstacleObject.width, height: obstacleObject.height } : undefined;
      const axis = ricochetAxis(projectileObject,
        projectileObject.travelVelocity, touch, obstacle);
      if (projectileObject.tryRicochet(axis)) {
        // Move out of the impact face so this collision cannot trigger twice.
        const v = projectileObject.travelVelocity;
        projectileObject.setPosition(projectileObject.x + Math.sign(v.x) * 4,
          projectileObject.y + Math.sign(v.y) * 4);
        this.showBriarRicochet(projectileObject.x, projectileObject.y);
        return;
      }
    }
    const effect = projectileObject.effect;
    const x = projectileObject.x, y = projectileObject.y;
    const attack = projectileObject.attack;
    projectileObject.destroy();
    if (effect === 'frost-burst') this.explodeFrostBolt(x, y, attack);
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

    if (enemyObject.aiState === 'defeated' || this.gameOver) return;
    const now = this.time.now;
    if (!contactHitReady(now, this.nextContactHit.get(enemyObject) ?? 0)) return;
    // Avoid damage every physics frame from ONE touching enemy, while other
    // enemies, bullets and hazards are never blocked by this enemy's timer.
    this.nextContactHit.set(enemyObject, nextContactHitAt(now, enemyObject.attackIntervalMs));
    this.damagePlayer(enemyObject.contactAttack);
  };

  private damagePlayer(attack: Readonly<Projectile['attack']>): void {
    if (!this.player || this.gameOver || !brambleDamageAllowed(this.brambleStage) ||
        !this.player.canReceiveContactDamage(this.time.now)) return;
    if (shouldParryHit(this.player.heroId, Math.random())) {
      // Parrying cancels this hit only; it grants NO immunity to the next shot.
      this.showPlayerParry();
      return;
    }
    const result = this.damageSystem.apply(this.player, attack);
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
      const visible = this.brambleStage === 'idle' && !!boss && boss.active && boss.aiState !== 'defeated';
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

  /** All delayed stage callbacks belong to the current encounter token. */
  private scheduleBrambleStage(ms: number, callback: () => void): void {
    const token = this.brambleSequence;
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.delayedCall(ms, () => {
      this.brambleTimers.delete(timer);
      if (token !== this.brambleSequence || !this.currentRoom ||
          this.currentRoom.number !== 20 || this.worldId !== 1 ||
          this.gameOver || this.transitioning || this.chapterComplete) return;
      callback();
    });
    this.brambleTimers.add(timer);
  }

  private trackBrambleFx<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.brambleEffects.add(object);
    return object;
  }

  private setBrambleMessage(message: string): void {
    this.brambleMessage?.setText(message);
  }

  /** Stage 1. Defer the first boss's *visual* death until after the cinematic.
   * Its gameplay death is still recorded once by handleEnemyDefeated. */
  private startWorldOneBossSplit(enemy: AdvancedEnemy): void {
    if (this.brambleCutsceneUsed || this.brambleStage !== 'idle' ||
        !enemy.isBrambleGunner || !this.currentRoom || !this.enemySpawner || !this.player ||
        this.gameOver || this.transitioning) return;
    this.brambleCutsceneUsed = true;
    this.brambleSequence++;
    this.brambleStage = nextBrambleStage('idle');
    this.brambleBoss = enemy;
    // Reserve both kills BEFORE registering Bramble's own death.
    this.roomProgress.addEnemies(2);
    this.player.heal(this.player.maxHp * 0.5);
    this.drawPlayerHealth();
    this.player.setVelocity(0, 0);
    this.controls?.setEnabled(false);
    this.abilities?.cancelMotion();
    this.abilities?.setControlsVisible(false);
    this.weapon?.clearGroundEffects();
    this.projectiles?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);
    this.clearBossBombs();
    this.physics.world.pause();
    this.updateBossHud();
    // Keep the actual defeated Gunner sprite visible until explosion, not a
    // separate lookalike sprite that can briefly overlap with the real boss.
    enemy.setAlpha(1).setDepth(170).setScale(1.75);
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x03130b, 0.48);
    const title = this.add.text(GAME_WIDTH / 2, 214, 'DE AARDE BEEFT', {
      fontFamily: 'system-ui, sans-serif', fontSize: '25px', fontStyle: 'bold',
      color: '#fef3c7', stroke: '#17260a', strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(GAME_WIDTH / 2, 253, 'BRAMBLE GUNNER ONTKETENT DE WIND', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold',
      color: '#bef264', stroke: '#071306', strokeThickness: 4,
    }).setOrigin(0.5);
    this.brambleOverlay = this.add.container(0, 0, [shade, title, subtitle])
      .setScrollFactor(0).setDepth(160);
    this.brambleMessage = subtitle;
    // Pan toward the Gunner so mobile players see the whole transformation.
    this.cameras.main.pan(enemy.x, enemy.y, 650, 'Sine.easeInOut');
    const bounds = this.currentRoom.layout.bounds;
    const start = {x: this.player.x, y: this.player.y};
    const dest = brambleWindLanding(enemy, this.player, bounds);
    const ring = this.trackBrambleFx(this.add.graphics().setDepth(168));
    const token = this.brambleSequence;
    this.tweens.addCounter({
      from: 0, to: 1, duration: BRAMBLE_CINEMATIC.windMs, ease: 'Sine.easeOut',
      onUpdate: tween => {
        if (token !== this.brambleSequence || this.brambleStage !== 'wind' || !ring.active) return;
        const t = tween.getValue() ?? 0;
        ring.clear();
        for (let band = 0; band < 5; band++) {
          const radius = 20 + t * (145 + band * 72);
          ring.lineStyle(4 + band, band % 2 ? 0xc4e792 : 0xfafde2, (1-t)*0.76);
          ring.strokeCircle(enemy.x, enemy.y, radius);
        }
        if (!this.player?.active) return;
        // Explicit tweened displacement while physics is paused; no damage.
        const x = Phaser.Math.Linear(start.x, dest.x, t);
        const y = Phaser.Math.Linear(start.y, dest.y, t);
        const body = this.player.body;
        if (body instanceof Phaser.Physics.Arcade.Body) body.reset(x, y);
        else this.player.setPosition(x, y);
      },
    });
    this.scheduleBrambleStage(BRAMBLE_CINEMATIC.windMs, () => {
      ring.clear();
      this.startBrambleGrowth(enemy);
    });
  }

  /** Stage 2: visible growth, energy and a cinematic HP gauge at screen top. */
  private startBrambleGrowth(enemy: AdvancedEnemy): void {
    if (this.brambleStage !== 'wind' || !enemy.active) return;
    this.brambleStage = nextBrambleStage(this.brambleStage);
    this.setBrambleMessage('DE GUNNER ABSORBEERT DE KRACHT VAN HET BOS');
    const bar = this.trackBrambleFx(this.add.graphics().setDepth(180).setScrollFactor(0));
    bar.fillStyle(0x051408, 0.97).fillRoundedRect((GAME_WIDTH-290)/2, 142, 290, 20, 8);
    bar.lineStyle(2, 0xd9f99d, 1).strokeRoundedRect((GAME_WIDTH-290)/2, 142, 290, 20, 8);
    bar.fillStyle(0x84cc16, 0.94).fillRoundedRect((GAME_WIDTH-286)/2, 146, 286, 12, 6);
    this.trackBrambleFx(this.add.text(GAME_WIDTH/2, 128, 'BRAMBLE GUNNER · ONTWAKEN', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: 'bold',
      color: '#fef9c3', stroke: '#020617', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(181).setScrollFactor(0));
    this.tweens.add({targets: enemy,
      scaleX: BRAMBLE_CINEMATIC.gunnerGrowthScale,
      scaleY: BRAMBLE_CINEMATIC.gunnerGrowthScale,
      duration: BRAMBLE_CINEMATIC.growthMs, ease: 'Cubic.easeInOut'});
    const energy = this.trackBrambleFx(this.add.graphics().setDepth(169));
    // A jagged glowing seam grows down the enlarged body, visibly warning
    // that a single Gunner is about to tear into TWO independent Sentinels.
    const fracture = this.trackBrambleFx(this.add.graphics().setDepth(187));
    const token = this.brambleSequence;
    this.tweens.addCounter({
      from: 0, to: 1, duration: BRAMBLE_CINEMATIC.growthMs,
      onUpdate: tween => {
        if (token !== this.brambleSequence || this.brambleStage !== 'growth' ||
            !energy.active) return;
        const t = tween.getValue() ?? 0;
        energy.clear();
        energy.lineStyle(4, 0xd9f99d, 0.28 + t * .65);
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4 + t * Math.PI;
          const r = 40 + 38 * t + 8 * Math.sin(t * 12 + i);
          energy.lineBetween(enemy.x + Math.cos(angle)*r,
            enemy.y + Math.sin(angle)*r,
            enemy.x + Math.cos(angle)*(r+30),
            enemy.y + Math.sin(angle)*(r+30));
        }
        energy.fillStyle(0x84cc16, 0.06 + t * 0.18);
        energy.fillCircle(enemy.x, enemy.y, 56 + t * 62);
        fracture.clear();
        if (t > 0.43) {
          const seam = (t - 0.43) / 0.57;
          const extent = 65 * seam;
          fracture.lineStyle(11, 0x4d250e, 0.75 * seam);
          fracture.beginPath();
          fracture.moveTo(enemy.x, enemy.y - extent);
          for (let i = 1; i <= 8; i++) {
            const y = enemy.y - extent + (2 * extent * i / 8);
            const x = enemy.x + (i % 2 ? 8 : -7) * seam;
            fracture.lineTo(x, y);
          }
          fracture.strokePath();
          fracture.lineStyle(4, 0xf2ffc0, seam);
          fracture.beginPath();
          fracture.moveTo(enemy.x, enemy.y - extent);
          for (let i = 1; i <= 8; i++) {
            fracture.lineTo(enemy.x + (i % 2 ? 8 : -7) * seam,
              enemy.y - extent + (2 * extent * i / 8));
          }
          fracture.strokePath();
        }
      },
    });
    this.scheduleBrambleStage(BRAMBLE_CINEMATIC.growthMs,
      () => this.startBrambleExplosion(enemy));
  }

  /** Stage 3: near full-screen shockwave with light, smoke and foliage. */
  private startBrambleExplosion(enemy: AdvancedEnemy): void {
    if (this.brambleStage !== 'growth') return;
    this.brambleStage = nextBrambleStage(this.brambleStage);
    this.setBrambleMessage('BLOOM SENTINELS ONTWAKEN');
    this.cameras.main.shake(350, 0.006);
    const flash = this.trackBrambleFx(this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2,
      GAME_WIDTH, GAME_HEIGHT, 0xe2f9b8, 0).setDepth(205).setScrollFactor(0));
    this.tweens.add({targets: flash, alpha: 0.96, duration: 240, yoyo: true,
      hold: 150, ease: 'Sine.easeInOut'});
    const foliage = this.trackBrambleFx(this.add.graphics().setDepth(204).setScrollFactor(0));
    const token = this.brambleSequence;
    this.tweens.addCounter({
      from: 0, to: 1, duration: BRAMBLE_CINEMATIC.explosionMs,
      onUpdate: tween => {
        if (token !== this.brambleSequence || this.brambleStage !== 'explosion' ||
            !foliage.active) return;
        const t = tween.getValue() ?? 0;
        foliage.clear();
        const size = 60 + t*GAME_HEIGHT;
        foliage.fillStyle(0xb6ef87, 0.36*(1-t));
        foliage.fillCircle(GAME_WIDTH/2, GAME_HEIGHT/2, size);
        for (let i = 0; i < 22; i++) {
          const angle = i*Math.PI*2/22;
          const radius = 16 + t*(290 + (i % 4)*58);
          const x = GAME_WIDTH/2 + Math.cos(angle)*radius;
          const y = GAME_HEIGHT/2 + Math.sin(angle)*radius;
          foliage.fillStyle(i%2 ? 0x457a2c : 0xd9f99d, 0.7*(1-t));
          foliage.fillEllipse(x,y,15+t*18,6+t*8);
        }
      },
    });
    this.scheduleBrambleStage(BRAMBLE_CINEMATIC.explosionMs,
      () => this.spawnBrambleTwins(enemy));
  }

  /** Stage 4: visibly tear the giant Gunner into two living Bloom Sentinels.
   * Input, damage and physics stay paused until the visual halves reach the
   * exact future enemy locations. Each FX object belongs to the cutscene and
   * is removed on room transition, shutdown, or normal completion. */
  private spawnBrambleTwins(enemy: AdvancedEnemy): void {
    if (this.brambleStage !== 'explosion' || !this.currentRoom ||
        !this.enemySpawner || !this.player) return;
    this.brambleStage = nextBrambleStage(this.brambleStage);
    const bounds = this.currentRoom.layout.bounds;
    const x = Phaser.Math.Clamp(enemy.x, bounds.x + 125, bounds.x + bounds.width - 125);
    const y = Phaser.Math.Clamp(enemy.y, bounds.y + 90, bounds.y + bounds.height - 90);
    const scale = enemy.scaleX;
    const texture = enemy.texture.key;
    const spread = BRAMBLE_CINEMATIC.splitDistance;
    const points = [{x:x-spread,y}, {x:x+spread,y}];

    // Render actual LEFT and RIGHT halves of the enlarged Gunner texture.
    // Its original texture is 48x48; the two cropped images make the tear
    // legible instead of making one boss vanish and two unrelated ones spawn.
    const halves = [-1,1].map((side,index) =>
      this.trackBrambleFx(
        this.add.image(x + side*12*scale,y,texture)
          .setCrop(index*BRAMBLE_CINEMATIC.splitHalfWidth,0,
            BRAMBLE_CINEMATIC.splitHalfWidth,48)
          .setScale(scale).setDepth(190)
      )
    );
    enemy.destroy();
    this.brambleBoss = undefined;

    // Reserve / instantiate exactly two real bosses, but keep them invisible
    // (and physics paused) until the two animated halves have fully formed.
    const twins = this.enemySpawner.spawnSplitBosses(points, 20);
    this.activeBosses = twins;
    for (const twin of twins) twin.setVisible(false).setAlpha(0);
    this.updateEnemyCount();
    this.setBrambleMessage('DE GUNNER SCHEURT OPEN — TWEE SENTINELS!');

    // Each fading half buds into the ACTUAL Bloom Sentinel texture and
    // smoothly moves to the identical position of the future hitbox.
    const buds = twins.map(twin =>
      this.trackBrambleFx(
        this.add.image(x,y,twin.texture.key).setScale(0.35)
          .setAlpha(0).setDepth(191).setTint(0xc6ffb0)
      )
    );
    const tendrils = this.trackBrambleFx(this.add.graphics().setDepth(192));
    const token = this.brambleSequence;
    this.tweens.addCounter({
      from:0,to:1,duration:BRAMBLE_CINEMATIC.handoffMs,ease:'Sine.easeInOut',
      onUpdate:tween=>{
        if (token !== this.brambleSequence || this.brambleStage !== 'handoff' ||
            !tendrils.active) return;
        const t = tween.getValue() ?? 0;
        tendrils.clear();
        for (let i=0;i<2;i++) {
          const side = i===0 ? -1 : 1;
          const travel = spread * Math.min(1, t / 0.88);
          const offset = side * travel;
          const half = halves[i]!;
          half.setPosition(x + side*12*scale + offset*0.70,
            y - Math.sin(t*Math.PI)*11)
            .setScale(scale*(1-0.52*t))
            .setAngle(side*31*t)
            .setAlpha(Math.max(0,1-Math.max(0,t-0.55)/0.40));
          const bud = buds[i]!;
          bud.setPosition(x+offset,y)
            .setScale(0.35+1.40*Math.min(1,t/0.90))
            .setAlpha(Math.min(1,Math.max(0,(t-0.18)*2.7)));
          // A bright tearing tether snaps as both new cores break free.
          if(t<0.86){
            const fade=1-t/0.86;
            tendrils.lineStyle(6,0x275b2c,0.72*fade);
            tendrils.lineBetween(x,y,x+offset,y);
            tendrils.lineStyle(2.5,0xecffc5,0.9*fade);
            tendrils.lineBetween(x,y-7,x+offset,y-6);
          }
          for(let leaf=0;leaf<5;leaf++){
            const theta=(leaf+i*5)*Math.PI*2/10;
            const radius = 12 + 95*t + (leaf%3)*9;
            tendrils.fillStyle(leaf%2?0xd9f99d:0x84cc16,(1-t)*0.82);
            tendrils.fillEllipse(x+Math.cos(theta)*radius,
              y+Math.sin(theta)*radius,6+4*t,3+2*t);
          }
        }
      },
    });
    if (this.brambleOverlay) {
      this.tweens.add({targets:this.brambleOverlay,alpha:0,
        duration:BRAMBLE_CINEMATIC.handoffMs});
    }
    this.scheduleBrambleStage(BRAMBLE_CINEMATIC.handoffMs,()=>{
      // Swap the final visual buds for their matching real boss sprites.
      for(const twin of twins) if(twin.active) twin.setVisible(true).setAlpha(1);
      this.clearBrambleCutscene();
      this.updateBossHud();
    });
  }

  /** Reverts ALL input/physics/FX on finish, room changes and scene shutdown. */
  private clearBrambleCutscene(): void {
    this.brambleSequence++;
    for (const timer of this.brambleTimers) timer.remove(false);
    this.brambleTimers.clear();
    this.brambleOverlay?.destroy(true);
    this.brambleOverlay = undefined;
    this.brambleMessage = undefined;
    for (const fx of this.brambleEffects) {
      this.tweens.killTweensOf(fx);
      if (fx.active) fx.destroy();
    }
    this.brambleEffects.clear();
    if (this.brambleBoss?.active) this.brambleBoss.destroy();
    this.brambleBoss = undefined;
    this.brambleStage = 'idle';
    this.physics.world.resume();
    this.controls?.setEnabled(true);
    this.abilities?.setControlsVisible(true);
  }

  private spawnSplitSnowPuffs(enemy: AdvancedEnemy): void {
    if (!this.currentRoom || !this.enemySpawner || this.roomProgress.doorOpen) return;
    const bounds = this.currentRoom.layout.bounds;
    const positions = [-44, 44].map(dx => ({
      x: Phaser.Math.Clamp(enemy.x + dx, bounds.x + 38, bounds.x + bounds.width - 38),
      y: Phaser.Math.Clamp(enemy.y + 28, bounds.y + 38, bounds.y + bounds.height - 38),
    }));
    this.roomProgress.addEnemies(2);
    this.enemySpawner.summonSnowPuffs(positions, this.currentRoom.number);
  }

  private readonly handleEnemySpawned = (): void => {
    this.aliveEnemies += 1;
    this.updateEnemyCount();
  };

  private readonly handleEnemyDefeated = (enemy: Slime): void => {
    const kind = enemy instanceof AdvancedEnemy ? enemy.kind : 'slime';
    if (this.gameOver || !this.run.defeatEnemy(enemy.enemyId, kind)) return;
    this.spawnCoins(enemy.x, enemy.y, kind);
    this.spawnXp(enemy.x, enemy.y, kind);
    this.spawnArmor(enemy, kind);
    if (this.worldId === 1 && this.roomProgress.roomNumber === 20 &&
        enemy instanceof AdvancedEnemy && enemy.isBrambleGunner) {
      this.startWorldOneBossSplit(enemy);
    }
    if (enemy instanceof AdvancedEnemy &&
        shouldSplitFrozenGiant(this.worldId, enemy.kind, enemy.enemyId)) {
      this.spawnSplitSnowPuffs(enemy);
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
    const drops = coinDropsForEnemy(kind, this.worldId, this.roomProgress.roomNumber);
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

  private spawnXp(x: number, y: number, kind: Parameters<typeof xpDropsForEnemy>[0]): void {
    const bounds = this.currentRoom?.layout.bounds;
    if (!bounds) return;
    const drops = xpDropsForEnemy(kind, this.worldId, this.roomProgress.roomNumber);
    drops.forEach((value, i) => {
      const angle = Math.PI * 2 * i / drops.length;
      const dx = drops.length === 1 ? 20 : 36 * Math.cos(angle);
      const dy = drops.length === 1 ? -20 : 36 * Math.sin(angle);
      this.xpCrystals.add(new XpPickup(this,
        Phaser.Math.Clamp(x + dx, bounds.x + 12, bounds.x + bounds.width - 12),
        Phaser.Math.Clamp(y + dy, bounds.y + 12, bounds.y + bounds.height - 12), value));
    });
  }

  private spawnArmor(enemy: Slime, kind: Parameters<typeof rollEnemyArmor>[0] | string): void {
    if (!this.player || !this.currentRoom) return;
    // Any owned hero can receive the gear, regardless of which hero is in this run.
    // The fourth random roll is independent from rarity and armor-slot selection.
    const heroId = chooseArmorDropHero(progressStore.current.unlockedHeroes, Math.random());
    if (!heroId) return;
    const item = rollEnemyArmor(kind === 'boss' ? 'boss' : 'normal',
      Math.random(), Math.random(), Math.random(), this.run.runId, enemy.enemyId,
      heroId);
    if (!item) return;
    const bounds = this.currentRoom.layout.bounds;
    this.armorDrops.add(new ArmorPickup(this,
      Phaser.Math.Clamp(enemy.x, bounds.x + 25, bounds.x + bounds.width - 25),
      Phaser.Math.Clamp(enemy.y, bounds.y + 25, bounds.y + bounds.height - 25), item));
  }

  private collectNearbyArmor(deltaMs: number): void {
    if (!this.player) return;
    for (const drop of this.armorDrops) {
      if (!drop.tick(this.player, deltaMs)) continue;
      const item = drop.item;
      const collected = progressStore.dispatch({ type: 'collectArmor', item });
      if (collected) {
        // Include only successfully collected drops on the results screen.
        this.collectedRunArmor.push(item);
        const slotName = armorDefinition(item).slot.toUpperCase();
        const text = this.add.text(this.player.x, this.player.y - 48,
          HEROES[item.heroId].name.toUpperCase() + ' ' + slotName +
          ' · ' + RARITY_CONFIG[item.rarity].label.toUpperCase(), {
            color: '#' + RARITY_CONFIG[item.rarity].color.toString(16).padStart(6, '0'),
            fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold',
            stroke: '#020617', strokeThickness: 4,
          }).setOrigin(.5).setDepth(80);
        this.tweens.add({ targets: text, y: text.y - 38, alpha: 0,
          duration: 1100, onComplete: () => text.destroy() });
      }
      drop.destroy();
      this.armorDrops.delete(drop);
    }
  }

  private collectNearbyXp(deltaMs: number): void {
    if (!this.player) return;
    for (const crystal of this.xpCrystals) {
      if (!crystal.tick(this.player, deltaMs)) continue;
      const heroId = this.player.heroId;
      const previous = progressStore.current.heroLevels[heroId];
      if (progressStore.dispatch({ type: 'collectHeroXp', id: heroId, amount: crystal.value })) {
        const current = progressStore.current.heroLevels[heroId];
        if (current > previous) {
          this.player.applyHeroLevel(previous, current);
          this.abilities?.setHeroLevel(current);
          this.drawPlayerHealth();
          this.showLevelUpGlow();
          const notice = this.add.text(this.player.x, this.player.y - 55,
            'LEVEL ' + current + '!  ' + (
              current >= 30 && previous < 30 ? 'ABILITY 3 UNLOCKED!' :
              current >= 20 && previous < 20 ? 'ABILITY 2 UNLOCKED!' :
              current >= 10 && previous < 10 ? 'SECOND WEAPON UNLOCKED!' :
              current >= 5 && previous < 5 ? 'ABILITY 1 UNLOCKED!' : ''), {
              color: '#67e8f9', fontFamily: 'system-ui, sans-serif', fontSize: '17px',
              fontStyle: 'bold', stroke: '#020617', strokeThickness: 4,
            }).setOrigin(0.5).setDepth(100);
          this.tweens.add({ targets: notice, y: notice.y - 55, alpha: 0,
            duration: 1100, onComplete: () => notice.destroy() });
        }
      }
      crystal.destroy();
      this.xpCrystals.delete(crystal);
    }
    this.updateXpHud();
  }

  /** A soft, lightweight cyan-gold aura that follows the hero for ~2.5 seconds. */
  private showLevelUpGlow(): void {
    if (!this.player) return;
    if (this.levelUpGlow) {
      this.tweens.killTweensOf(this.levelUpGlow.list);
      this.levelUpGlow.destroy();
    }
    const aura = this.add.container(this.player.x, this.player.y).setDepth(17);
    const outer = this.add.circle(0, 0, 37, 0x67e8f9, 0.11)
      .setStrokeStyle(3, 0x67e8f9, 0.75);
    const inner = this.add.circle(0, 0, 28, 0xfde68a, 0.09)
      .setStrokeStyle(2, 0xfef08a, 0.55);
    // The circles have no collision body and never block pointer input.
    aura.add([outer, inner]);
    this.levelUpGlow = aura;
    this.levelUpGlowEndAt = this.time.now + 2500;
    this.tweens.add({
      targets: outer, scale: 1.24, alpha: 0.42,
      duration: 530, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
    this.tweens.add({
      targets: inner, scale: 1.14, alpha: 0.55,
      duration: 420, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
  }

  private updateLevelUpGlow(): void {
    const glow = this.levelUpGlow;
    if (!glow || !this.player) return;
    if (this.time.now >= this.levelUpGlowEndAt) {
      this.tweens.killTweensOf(glow.list);
      glow.destroy();
      this.levelUpGlow = undefined;
      return;
    }
    glow.setPosition(this.player.x, this.player.y);
  }

  private updateXpHud(): void {
    const profile = progressStore.current;
    const id = profile.selectedHero;
    const level = profile.heroLevels[id];
    this.xpHudText?.setText(level >= MAX_HERO_LEVEL ? 'HERO LV.' + MAX_HERO_LEVEL + ' · MAX' :
      'HERO LV.' + level + '  ·  XP ' + profile.heroXp[id] + '/' + heroXpRequirement(level));
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
    for (const crystal of this.xpCrystals) crystal.destroy();
    this.xpCrystals.clear();
    for (const drop of this.armorDrops) drop.destroy();
    this.armorDrops.clear();
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
    this.healthText.setText(
      `${displayedHp(this.player.currentHp)} / ${displayedHp(this.player.maxHp)}`,
    );
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
    if (!this.player) return;
    // Short red impact tint is purely visual; it never prevents another hit.
    this.player.setTint(0xef4444).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(90, () => {
      if (this.player?.active && !this.gameOver) this.player.clearTint();
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
    const cards = this.upgrades.offer(this.player.currentHp < this.player.maxHp, this.weapon?.attackMode ?? 'projectile');
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
    else if (id === 'meleeRange') this.weapon.extraMeleeRange += 0.2;
    else if (id === 'meleeStun') this.weapon.meleeStunMs = 500;
    else this.player.applyRunBonus(id);
    if (id === 'cooldown') this.abilities?.shortenActiveCooldowns(this.time.now, 0.9);
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
    runCheckpointStore.clear();
    this.checkpoint = undefined;
    progressStore.dispatch({ type: 'settleRun', report, heroId: this.player?.heroId });
    this.scene.launch(GAME_OVER_SCENE_KEY, {
      report, chosenUpgrades: this.upgrades.chosen(),
      collectedArmor: [...this.collectedRunArmor],
    });
    this.scene.sleep();
  }

  /** Save only at the start of a room, before any drops or damage within it. */
  private captureRoomCheckpoint(): void {
    if (!this.player || !this.currentRoom || this.gameOver || this.chapterComplete) return;
    const profile = progressStore.current;
    const checkpoint: RunCheckpoint = {
      version: 1, savedAt: Date.now(), worldId: this.worldId,
      room: this.roomProgress.roomNumber,
      heroId: this.player.heroId,
      weaponId: profile.selectedWeapon,
      health: this.player.currentHp,
      shield: this.player.shieldHp,
      upgrades: this.upgrades.snapshot(),
      ledger: this.run.snapshot(),
    };
    runCheckpointStore.save(checkpoint);
  }

  private createPauseButton(): void {
    // A fixed-camera hit area works on both mobile and desktop.
    const button = this.add.rectangle(GAME_WIDTH - 56, 93, 94, 32, 0x1a384d, .96)
      .setStrokeStyle(2, 0x67e8f9, .9)
      .setScrollFactor(0).setDepth(180)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH - 56, 93, 'Ⅱ  PAUZE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px',
      fontStyle: 'bold', color: '#e0f2fe',
    }).setOrigin(.5).setScrollFactor(0).setDepth(181);
    button.on('pointerdown', () => this.openPausePanel());
  }

  private openPausePanel(): void {
    if (!this.player || this.pausedByPlayer || this.gameOver || this.chapterComplete ||
        this.transitioning || this.choosingUpgrade || this.brambleStage !== 'idle') return;
    this.pausedByPlayer = true;
    this.player.setVelocity(0, 0);
    this.controls?.setEnabled(false);
    this.physics.world.pause();
    const overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0).setDepth(200);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH + 20, GAME_HEIGHT + 20, 0x020617, .82);
    shade.setInteractive();
    const plate = this.add.rectangle(0, 0, 344, 276, 0x13283b, .99)
      .setStrokeStyle(3, 0x58d4eb, 1);
    const title = this.add.text(0, -102, 'AVONTUUR GEPAUZEERD', {
      fontFamily: 'system-ui, sans-serif', color: '#f8fafc',
      fontStyle: 'bold', fontSize: '19px',
    }).setOrigin(.5);
    const desc = this.add.text(0, -54,
      'WERELD ' + this.worldId + '  ·  KAMER ' + this.roomProgress.roomNumber +
      '\nDoorgaan start deze kamer opnieuw.\nVorige kamers en beloningen blijven bewaard.', {
        fontFamily: 'system-ui, sans-serif', color: '#b6cce0', fontSize: '12px',
        align: 'center', lineSpacing: 6,
      }).setOrigin(.5);
    const continueBg = this.add.rectangle(0, 35, 292, 50, 0x0788a4)
      .setStrokeStyle(2, 0x67e8f9).setInteractive({ useHandCursor: true });
    const continueText = this.add.text(0, 35, '▶  VERDER SPELEN', {
      fontFamily: 'system-ui, sans-serif', color: '#f8fafc',
      fontStyle: 'bold', fontSize: '15px',
    }).setOrigin(.5);
    const saveBg = this.add.rectangle(0, 100, 292, 48, 0x284057)
      .setStrokeStyle(2, 0x8babc5).setInteractive({ useHandCursor: true });
    const saveText = this.add.text(0, 100, 'OPSLAAN & HOOFDMENU', {
      fontFamily: 'system-ui, sans-serif', color: '#f8fafc',
      fontStyle: 'bold', fontSize: '14px',
    }).setOrigin(.5);
    overlay.add([shade,plate,title,desc,continueBg,continueText,saveBg,saveText]);
    this.pausePanel = overlay;
    continueBg.on('pointerdown', () => {
      overlay.destroy(true);
      this.pausePanel = undefined;
      this.pausedByPlayer = false;
      this.physics.world.resume();
      this.controls?.setEnabled(true);
    });
    saveBg.on('pointerdown', () => {
      // The checkpoint was already written at room start. Never settle
      // unfinished run-gold and never overwrite it with partial-room kills.
      this.scene.start(MENU_SCENE_KEY);
    });
  }

  private finishChapterRooms(): void { this.completeRun(true); }

  private endRun(): void { this.completeRun(false); }

  private shutdown(): void {
    this.pausePanel?.destroy(true);
    this.pausePanel = undefined;
    this.clearBrambleCutscene();
    this.physics.world.resume();
    this.clearCoins();
    if (this.levelUpGlow) {
      this.tweens.killTweensOf(this.levelUpGlow.list);
      this.levelUpGlow.destroy();
      this.levelUpGlow = undefined;
    }
    this.clearBossBombs();
    this.clearIceEffects();
    this.iceTrailGraphics?.destroy();
    this.iceTrailGraphics = undefined;
    this.upgradeHitAreas.forEach(hitArea => hitArea.destroy());
    this.upgradeHitAreas = [];
    this.upgradeOverlay?.destroy(true);
    this.upgradeOverlay = undefined;
    this.upgradeReady = false;
    this.abilities?.destroy();
    this.abilities = undefined;
    this.frostStatusVisual?.destroy();
    this.frostStatusVisual = undefined;
    this.witchSummons.clear();
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

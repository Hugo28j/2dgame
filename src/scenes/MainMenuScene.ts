import Phaser from 'phaser';
import { GAME_SCENE_KEY, GAME_WIDTH, MENU_SCENE_KEY } from '../config/constants';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { isWorldUnlocked, getWorld } from '../worlds/worldConfig';
import { ensureWorldDiorama } from '../worlds/worldMapArt';
import { ensureArmorIcon } from '../ui/armorIconArt';
import { ensureDressedHeroTexture } from '../heroes/heroEquipmentArt';
import { worldAtlasEntries, type WorldAtlasEntry } from '../worlds/worldAtlas';
import {
  HERO_IDS, HEROES, getHeroStats, MAX_HERO_LEVEL, type HeroId,
} from '../heroes/heroConfig';
import { progressStore, heroXpRequirement, type ProfileAction } from '../progression/ProgressStore';
import {
  CONTROL_ACTIONS, CONTROL_LABELS, formatBinding, mouseButtonKey, normalizeBindKey, rebindKey,
  type ControlAction,
} from '../input/keyBindings';
import {
  ARMOR_SLOTS, ARMOR_MAX_LEVEL, ARMOR_MAX_STARS, RARITY_CONFIG,
  armorDefinition, armorUpgradeCost, armorBonuses, armorStatText,
  type ArmorItem, type ArmorSlot,
} from '../progression/armor';
import {
  HERO_WEAPONS, WEAPONS, getWeaponStats, weaponBaseAttackIntervalMs,
  weaponUpgradeCost, MAX_WEAPON_LEVEL, type WeaponId,
} from '../weapons/weaponConfig';
import {
  ABILITIES, HERO_ABILITIES, MAX_ABILITY_LEVEL, abilityUpgradeCost, getAbilityStats,
  isAbilityUnlocked,
} from '../abilities/abilityConfig';
import { abilityMenuSummary } from '../ui/menuPresentation';
import { SHOP_CHESTS, type ShopChest } from '../ui/shopCatalog';
import { displayedHp } from '../ui/displayValues';
import { canFuseArmor, EQUIPMENT_VISIBLE_ROWS, inventoryMaxOffset, isInventoryRowTap, moveInventoryOffset } from '../ui/equipmentInventory';
import { advanceUpgradeIntent, sameUpgradeIntent, type UpgradeIntent } from '../ui/upgradeConfirmation';

type MenuTab = 'worlds' | 'weapons' | 'shop' | 'settings';
type EquipmentView = 'overview' | 'heroes' | 'hero-detail' | 'list' | 'detail';
type EquipmentSlot = ArmorSlot | 'weapon';
type UpgradeProfileAction = Extract<ProfileAction, { type: 'upgradeArmor' | 'upgradeWeapon' | 'upgradeAbility' }>;
type ButtonStyle = 'normal' | 'selected' | 'primary' | 'danger' | 'quiet';
const FONT = 'system-ui, sans-serif';
const COLOR = {
  background: 0x090f19, panel: 0x111e2d, card: 0x192a3b,
  border: 0x304459, accent: 0x58d4eb, gold: 0xfbbf24, muted: 0x9daec5,
  white: '#f5f9ff', secondary: '#b9c9d8', faint: '#899bad',
} as const;

export class MainMenuScene extends Phaser.Scene {
  private tab: MenuTab = 'worlds';
  private worldView: 'showcase' | 'atlas' = 'showcase';
  private worldMessage = '';
  private heroPage = 0;
  private upgradeCategory: 'weapons' | 'abilities' | 'armor' = 'armor';
  private equipmentView: EquipmentView = 'overview';
  private equipmentSlot: EquipmentSlot = 'weapon';
  private equipmentItemId: string | null = null;
  private pendingUpgrade: UpgradeIntent | null = null;
  private inventoryOffset = 0;
  private inventoryTouchStart: { x: number; y: number } | null = null;
  private inventoryPressedRowId: string | null = null;
  private armorPage = 0;
  private armorSlot: ArmorSlot = 'helm';
  private armorHero: HeroId = 'guardian';
  private settingsView: 'general' | 'controls' = 'general';
  private resetRequested = false;
  private awaitingKey?: ControlAction;
  private notice = '';
  private suppressNextContextMenu = false;

  public constructor() { super(MENU_SCENE_KEY); }

  public create(): void {
    // Center the original menu inside the wider desktop viewport.
    this.cameras.main.setScroll((390 - GAME_WIDTH) / 2, 0);
    this.drawBackground();
    this.drawHeader();
    this.drawNavigation();
    this.plate(195, 490, 354, 476, COLOR.panel, COLOR.border, 17);

    if (this.tab === 'worlds') this.drawWorlds();
    else if (this.tab === 'weapons') this.drawEquipment();
    else if (this.tab === 'shop') this.drawShop();
    else if (this.settingsView === 'controls') this.drawControls();
    else this.drawSettings();

    this.button(195, 766, 342, 60, '▶   START AVONTUUR',
      () => this.scene.start(GAME_SCENE_KEY), 'primary', false, 17);
    this.text(195, 810, getWorld(progressStore.current.selectedWorld).name.toUpperCase() +
      '  ·  KAMER 1–' + CHAPTER_ROOM_COUNT, 11, COLOR.secondary, true);

    this.input.keyboard?.on('keydown', this.captureBinding);
    this.input.on('wheel', this.handleInventoryWheel);
    this.input.on('pointerdown', this.handleInventoryTouchStart);
    this.input.on('pointerup', this.handleInventoryTouchEnd);
    // Capture before Phaser delivers game-object clicks; the click that opens
    // the remap modal is not captured because awaitingKey is still undefined.
    window.addEventListener('pointerdown', this.captureMouseButton, true);
    window.addEventListener('contextmenu', this.preventCaptureContextMenu, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.captureBinding);
      this.input.off('wheel', this.handleInventoryWheel);
      this.input.off('pointerdown', this.handleInventoryTouchStart);
      this.input.off('pointerup', this.handleInventoryTouchEnd);
      window.removeEventListener('pointerdown', this.captureMouseButton, true);
      window.removeEventListener('contextmenu', this.preventCaptureContextMenu, true);
    });
  }

  private drawBackground(): void {
    this.cameras.main.setBackgroundColor('#090f19');
    this.add.rectangle(195, 422, 390, 844, COLOR.background);
    this.add.circle(360, 4, 190, 0x15516b, 0.16);
    this.add.circle(-40, 790, 175, 0x0e4762, 0.13);
    const lines = this.add.graphics().setAlpha(0.06);
    lines.lineStyle(1, 0x5b8599, 1);
    for (let x = 0; x <= 390; x += 40) lines.lineBetween(x, 0, x, 844);
    for (let y = 0; y <= 844; y += 40) lines.lineBetween(0, y, 390, y);
  }

  private drawHeader(): void {
    const crest = this.add.graphics();
    crest.lineStyle(2, COLOR.accent, 0.85);
    crest.strokeCircle(195, 29, 15);
    crest.fillStyle(COLOR.accent);
    crest.fillTriangle(195, 16, 204, 37, 186, 37);
    crest.fillStyle(COLOR.gold);
    crest.fillTriangle(195, 38, 200, 31, 190, 31);
    this.text(195, 65, 'DUNGEON ASCENT', 27, COLOR.white, true, true);
    this.text(195, 96, 'KIES JE UITRUSTING  ·  OVERLEEF DE DUNGEON', 10,
      COLOR.secondary, true);

    const profile = progressStore.current;
    const hero = HEROES[profile.selectedHero];
    this.plate(195, 150, 354, 74, 0x152638, 0x30485b, 13);
    this.add.circle(55, 147, 23, hero.color, 0.18).setStrokeStyle(2, hero.color, 0.9);
    this.add.image(55, 147, ensureDressedHeroTexture(this, profile.selectedHero,
      profile.equippedArmor[profile.selectedHero], profile.armorInventory)).setDisplaySize(45, 45);
    this.text(90, 129, 'JOUW HELD  ·  LV.' + profile.heroLevels[profile.selectedHero],
      10, COLOR.faint);
    this.fittedText(90, 150, hero.name.toUpperCase(), 15, COLOR.white, 134, true);
    this.fittedText(90, 169, WEAPONS[profile.selectedWeapon].name, 10, '#8ce3f1', 132);
    this.add.rectangle(238, 150, 1, 44, COLOR.border);
    this.text(256, 132, 'BESCHIKBAAR GOUD', 9, COLOR.faint);
    this.fittedText(256, 157, profile.gold.toLocaleString('nl-BE') + ' G',
      19, '#fde68a', 110, true);
    this.text(23, 196, 'WERELD ' + profile.selectedWorld + ' / 5', 10, COLOR.secondary);
    this.text(367, 196, 'RECORD ' +
      profile.worldBestRooms[profile.selectedWorld - 1] + ' / ' + CHAPTER_ROOM_COUNT,
      10, COLOR.secondary).setOrigin(1, 0.5);
  }

  private drawNavigation(): void {
    const tabs: Array<[MenuTab, string]> = [
      ['worlds', 'WERELDEN'], ['weapons', 'UITRUSTING'],
      ['shop', 'SHOP'], ['settings', 'OPTIES'],
    ];
    tabs.forEach(([tab, label], index) => {
      const x = 63 + index * 88;
      const active = this.tab === tab;
      this.button(x, 227, 84, 42, label, () => this.chooseTab(tab),
        active ? 'selected' : 'quiet', false, label === 'UITRUSTING' ? 9 : 10);
      if (active) this.add.rectangle(x, 247, 42, 3, COLOR.accent, 0.9);
    });
  }

  private chooseTab(tab: MenuTab): void {
    this.tab = tab;
    if (tab === 'weapons') {
      this.armorHero = progressStore.current.selectedHero;
      this.armorPage = 0;
    }
    this.equipmentView = 'overview';
    this.inventoryOffset = 0;
    this.equipmentItemId = null;
    this.pendingUpgrade = null;
    if (tab !== 'settings') this.settingsView = 'general';
    if (tab !== 'worlds') {
      this.worldView = 'showcase';
      this.worldMessage = '';
    }
    this.resetRequested = false;
    this.awaitingKey = undefined;
    this.notice = '';
    this.scene.restart();
  }

  private runAction(action: ProfileAction): void {
    progressStore.dispatch(action);
    this.scene.restart();
  }

  private isConfirmingUpgrade(action: UpgradeProfileAction, level: number): boolean {
    return sameUpgradeIntent(this.pendingUpgrade, action, level);
  }

  /** First click only arms the upgrade preview. Second identical click pays gold. */
  private requestUpgrade(action: UpgradeProfileAction, level: number): void {
    const next = advanceUpgradeIntent(this.pendingUpgrade, action, level);
    this.pendingUpgrade = next.pending;
    if (next.shouldApply) this.runAction(action);
    else this.scene.restart();
  }

  private drawWorlds(): void {
    const profile = progressStore.current;
    const entries=worldAtlasEntries(profile.selectedWorld,profile.completedWorlds,
      profile.worldBestRooms);
    if (this.worldView === 'atlas') {
      this.drawWorldAtlas(entries);
      return;
    }
    const entry=entries[profile.selectedWorld-1]!;
    const world=entry.world;
    // Deep, painted foreground and distant 2.5D landscape: no external
    // downloads, no WebGL-only effects, sharp even on high-DPI mobile devices.
    // The illustration itself is the destination selector. With the
    // redundant heading and button removed it fills the freed vertical space.
    this.plate(195,484,338,425,0x0c1b28,world.accent,17);
    const key=ensureWorldDiorama(this,world.id);
    const painting=this.add.image(195,452,key).setDisplaySize(326,344);
    painting.setAlpha(1);
    // Deliberate layered interface vignette over the illustration, without
    // darkening the main painting or hiding its boss/mountain silhouette.
    for(let i=0;i<6;i++)
      this.add.rectangle(195,543+i*13,325,14,0x06121b,0.07+i*.065);
    this.add.rectangle(195,316,325,63,0x071622,.70);
    this.add.circle(329,313,17,world.accent,.88);
    this.text(329,313,String(world.id),14,'#07131f',true,true);
    this.fittedText(52,305,world.name.toUpperCase(),20,'#fffdf4',251,true)
      .setStroke('#05131f',3);
    this.fittedText(52,332,world.subtitle,10,'#d7e6eb',253);
    // Keep meaningful progress below the artwork, but eliminate decorative
    // prompts, duplicate world-map buttons and unnecessary explanatory copy.
    this.text(49,651,'BESTE KAMER',10,'#b2d1da',false,true);
    this.text(341,651,entry.bestRoom+' / '+CHAPTER_ROOM_COUNT,
      12,'#fff8e4',false,true).setOrigin(1,.5);
    this.add.rectangle(195,676,293,9,0x081926,.85);
    this.add.rectangle(49,676,292*entry.progress,8,world.accent,1)
      .setOrigin(0,.5);
    this.add.rectangle(49,680,292*entry.progress,2,0xffffff,.34)
      .setOrigin(0,.5);
    // A full-size hit area matches the visible image on touch and desktop.
    const hit=this.add.zone(195,452,326,344).setInteractive({useHandCursor:true});
    hit.on('pointerdown',()=>this.openWorldAtlas());
  }

  private openWorldAtlas(): void {
    this.worldView='atlas';
    this.worldMessage='';
    this.scene.restart();
  }

  /** Mario-inspired route board: illustrated realms connected as destinations.
   * A locked node is informative but never dispatches selectWorld. */
  private drawWorldAtlas(entries:readonly WorldAtlasEntry[]):void {
    // The world thumbnails are the destination selector: no redundant title or instructions.
    const map=this.add.graphics();
    const route: Array<[number,number]>=entries.map((_,i)=>[
      43+(i%2?5:0),312+i*74]);
    map.lineStyle(5,0x253e52,.95);
    map.beginPath();map.moveTo(route[0]![0],route[0]![1]);
    for(const [x,y] of route.slice(1))map.lineTo(x,y);
    map.strokePath();
    map.lineStyle(2,0xb6c8bd,.58);
    for(let i=0;i<route.length-1;i++){
      const a=route[i]!,b=route[i+1]!;
      for(let t=.07;t<.94;t+=.18){
        const x=a[0]+(b[0]-a[0])*t;
        const y=a[1]+(b[1]-a[1])*t;
        map.lineBetween(x,y,x+1.7,y+7);
      }
    }
    entries.forEach((entry,index)=>{
      const world=entry.world;
      const y=312+index*74;
      const bg=entry.selected?0x223f49:0x132738;
      this.plate(195,y,326,57,bg,entry.selected?world.accent:0x365166,10);
      const texture=ensureWorldDiorama(this,world.id);
      const thumbnail=this.add.image(98,y,texture).setDisplaySize(91,49);
      thumbnail.setAlpha(entry.unlocked?1:.31);
      this.add.rectangle(98,y,92,50,0x07121c,entry.unlocked?0:.35)
        .setStrokeStyle(1,entry.unlocked?world.accent:0x536274,.74);
      this.add.circle(42,y,13,entry.unlocked?world.accent:0x304151,1)
        .setStrokeStyle(2,entry.unlocked?0xd9eff5:0x637383,.7);
      this.text(42,y,entry.unlocked?String(world.id):'×',11,
        entry.unlocked?'#0b1c28':'#c1ccd5',true,true);
      this.fittedText(151,y-15,world.name.toUpperCase(),12,
        entry.unlocked?COLOR.white:COLOR.faint,151,true);
      this.fittedText(151,y+1,entry.unlocked?
        (entry.complete?'VOLTOOID':'KAMER '+entry.bestRoom+'/'+CHAPTER_ROOM_COUNT):
        entry.requirement.toUpperCase(),9,
        entry.complete?'#b2faaf':entry.unlocked?COLOR.secondary:COLOR.faint,158);
      this.add.rectangle(219,y+19,135,4,0x0c1929);
      if(entry.unlocked)
        this.add.rectangle(151,y+19,136*entry.progress,4,world.accent)
          .setOrigin(0,.5);
      this.fittedText(342,y-12,entry.selected?'ACTIEF':entry.unlocked?'KIES':'SLOT',
        10,entry.selected?'#bffef2':entry.unlocked?'#fff7ca':'#8a9dae',40,true)
        .setOrigin(1,.5);
      const spot=this.add.zone(195,y,324,57).setInteractive({useHandCursor:true});
      spot.on('pointerdown',()=>{
        if(!entry.unlocked){
          this.worldMessage=entry.requirement+' om dit rijk te openen';
          this.scene.restart();
          return;
        }
        this.worldMessage='';
        this.worldView='showcase';
        if(!entry.selected) this.runAction({type:'selectWorld',id:world.id});
        else this.scene.restart();
      });
    });
    if(this.worldMessage)
      this.fittedText(195,681,this.worldMessage,10,'#fcb98c',310).setOrigin(.5,.5);
    this.button(195,712,322,27,'‹   TERUG NAAR MIJN WERELD',
      ()=>{this.worldView='showcase';this.worldMessage='';this.scene.restart();},
      'quiet',false,10);
  }

  private drawHeroes(): void {
    this.section('KIES JE HELD', 'Kies of ontgrendel je held voor je uitrusting');
    this.button(313, 277, 80, 27, '‹ TERUG', () => {
      this.equipmentView = 'overview'; this.scene.restart();
    }, 'quiet', false, 10);
    const profile = progressStore.current;
    const pageSize = 4;
    const pages = Math.ceil(HERO_IDS.length / pageSize);
    this.heroPage = Math.max(0, Math.min(this.heroPage, pages - 1));
    HERO_IDS.slice(this.heroPage * pageSize, (this.heroPage + 1) * pageSize).forEach((id, index) => {
      const hero = HEROES[id];
      const y = 347 + index * 91;
      const unlocked = profile.unlockedHeroes.includes(id);
      const available = isWorldUnlocked(hero.requiredWorld, profile.completedWorlds);
      const milestone = id === 'ranger' ? 10 : id === 'mage' ? 20 : 0;
      const selected = profile.selectedHero === id;
      this.plate(195, y, 328, 85,
        selected ? 0x1b3844 : COLOR.card, selected ? hero.color : COLOR.border, 11);
      this.add.circle(61, y - 15, 24, hero.color, 0.15);
      this.add.image(61, y - 15, ensureDressedHeroTexture(this, id,
        profile.equippedArmor[id], profile.armorInventory)).setDisplaySize(47, 47);
      this.fittedText(93, y - 29, hero.name.toUpperCase(), 13, COLOR.white, 169, true);
      this.fittedText(93, y - 10, 'LV.' + profile.heroLevels[id] +
        ' · XP ' + profile.heroXp[id] + '/' + (profile.heroLevels[id] >= MAX_HERO_LEVEL
          ? 'MAX' : heroXpRequirement(profile.heroLevels[id])), 10, COLOR.secondary, 168);
      this.fittedText(44, y + 14, 'PASSIEF: ' + hero.passive, 10, '#fcd34d', 304);
      const stats = getHeroStats(id, profile.heroLevels[id]);
      this.fittedText(44, y + 32, 'HP ' + displayedHp(stats.maxHp) +
        '   ·   SCHADE ' + stats.damage + '   ·   DEF ' + stats.defense,
        10, COLOR.secondary, 302);
      const label = selected ? 'ACTIEF' : unlocked ? 'KIES' :
        milestone ? 'W1 · ' + milestone : !available ? 'WERELD ' + hero.requiredWorld : hero.unlockCost + ' G';
      this.button(313, y - 10, 86, 34, label, () => {
        this.equipmentView = 'overview';
        this.armorHero = id;
        this.runAction(unlocked ? { type: 'selectHero', id } : { type: 'unlockHero', id });
      }, selected ? 'selected' : 'normal',
      selected || (!unlocked && (milestone > 0 || !available || profile.gold < hero.unlockCost)), 10);
    });
    if (pages > 1) {
      this.button(100, 700, 107, 34, '‹ VORIGE', () => {
        this.heroPage = Math.max(0, this.heroPage - 1);
        this.scene.restart();
      }, 'quiet', this.heroPage === 0, 10);
      this.text(195, 700, (this.heroPage + 1) + ' / ' + pages,
        12, COLOR.secondary, true, true);
      this.button(290, 700, 107, 34, 'VOLGENDE ›', () => {
        this.heroPage = Math.min(pages - 1, this.heroPage + 1);
        this.scene.restart();
      }, 'quiet', this.heroPage === pages - 1, 10);
    }
  }


  /** A single loadout: hero, weapon and all three pieces are visible at a glance. */
  private drawEquipment(): void {
    if (!progressStore.current.unlockedHeroes.includes(this.armorHero))
      this.armorHero = progressStore.current.selectedHero;
    if (this.equipmentView === 'heroes') return this.drawHeroes();
    if (this.equipmentView === 'hero-detail') return this.drawHeroDetail();
    if (this.equipmentView === 'list') return this.drawEquipmentList();
    if (this.equipmentView === 'detail') return this.drawEquipmentDetail();

    const profile = progressStore.current;
    const heroId = this.armorHero;
    const hero = HEROES[heroId];
    const weaponId = profile.selectedWeapons[heroId];
    const weapon = WEAPONS[weaponId];
    const armor = profile.equippedArmor[heroId];
    const labels: Record<ArmorSlot, string> = { helm: 'HELM', body: 'PANTSER', boots: 'SCHOENEN' };
    const heroStats = getHeroStats(heroId, profile.heroLevels[heroId]);

    // Use pointer-up to open a new screen. Starting it on pointer-down allowed
    // the same finger release to select the first inventory row accidentally.
    const heroCard = this.plate(195, 345, 328, 112, 0x172e42, hero.color, 13);
    heroCard.setInteractive(new Phaser.Geom.Rectangle(0, 0, 328, 112),
      Phaser.Geom.Rectangle.Contains);
    let heroPressed = false;
    heroCard.on('pointerdown', () => { heroPressed = true; });
    heroCard.on('pointerout', () => { heroPressed = false; });
    heroCard.on('pointerup', () => {
      if (!heroPressed) return;
      heroPressed = false;
      this.heroPage = Math.floor(Math.max(0, HERO_IDS.indexOf(heroId)) / 4);
      this.equipmentView = 'heroes';
      this.scene.restart();
    });
    this.add.circle(77, 345, 30, hero.color, .20).setStrokeStyle(2, hero.color);
    this.add.image(77, 345, ensureDressedHeroTexture(this, heroId,
      profile.equippedArmor[heroId], profile.armorInventory)).setDisplaySize(57, 57);
    this.fittedText(118, 309, hero.name.toUpperCase(), 16, COLOR.white, 195, true);
    this.fittedText(118, 330, 'HELD  ·  LEVEL ' + profile.heroLevels[heroId], 10,
      '#9de4f3', 194);
    this.fittedText(118, 352, 'HP ' + displayedHp(heroStats.maxHp) +
      '  ·  DEF ' + heroStats.defense.toFixed(1) +
      '  ·  DMG ' + heroStats.damage.toFixed(1), 10, COLOR.secondary, 207);
    this.fittedText(118, 374, 'ATK ×' + heroStats.attackSpeed.toFixed(2) +
      '  ·  LOOP ' + heroStats.movementSpeed.toFixed(0) +
      '  ·  CRIT ' + Math.round(heroStats.criticalChance * 100) + '%',
      9, '#9fe2d9', 209);
    this.text(342, 327, '›', 23, '#8ce3f1', true);

    const weaponStats = getWeaponStats(weaponId, profile.weaponLevels[weaponId]);
    const weaponCard = this.plate(195, 470, 328, 112, 0x172c3f, COLOR.accent, 12);
    weaponCard.setInteractive(new Phaser.Geom.Rectangle(0, 0, 328, 112),
      Phaser.Geom.Rectangle.Contains);
    let weaponPressed = false;
    weaponCard.on('pointerdown', () => { weaponPressed = true; });
    weaponCard.on('pointerout', () => { weaponPressed = false; });
    weaponCard.on('pointerup', () => {
      if (!weaponPressed) return;
      weaponPressed = false;
      this.openEquipmentList('weapon');
    });
    this.add.circle(77, 470, 30, weapon.color, .15).setStrokeStyle(2, weapon.color);
    this.text(77, 470, weapon.attackMode === 'melee' ? '⚔' : '➶', 28, COLOR.white, true, true);
    this.fittedText(118, 428, 'WAPEN  ·  LEVEL ' + profile.weaponLevels[weaponId], 10,
      '#89dbe8', 202, true);
    this.fittedText(118, 451, weapon.name.toUpperCase(), 14, COLOR.white, 196, true);
    this.fittedText(118, 476, 'SCHADE ' + weaponStats.damage.toFixed(1) +
      '  ·  ' + (1000 / weaponBaseAttackIntervalMs(weaponStats)).toFixed(2) + ' AANV./S',
      10, COLOR.secondary, 206);
    this.fittedText(118, 498, weaponStats.attackMode === 'melee'
      ? 'BEREIK ' + Math.round(weaponStats.meleeRange) +
        '  ·  SLAGEN ' + weaponStats.projectileCount
      : 'PROJECTIELEN ' + weaponStats.projectileCount +
        '  ·  BEREIK ' + Math.round(weaponStats.projectileRange),
      10, '#9fe2d9', 206);
    this.text(342, 451, '›', 23, '#8ce3f1', true);

    ARMOR_SLOTS.forEach((slot, index) => {
      const item = profile.armorInventory.find(piece => piece.id === armor[slot]);
      const rarity = item ? RARITY_CONFIG[item.rarity] : undefined;
      const center = 81 + index * 114;
      const card = this.plate(center, 595, 105, 106, item ? 0x1b3344 : COLOR.card,
        rarity?.color ?? COLOR.border, 12);
      card.setInteractive(new Phaser.Geom.Rectangle(0, 0, 105, 106),
        Phaser.Geom.Rectangle.Contains);
      let armorPressed = false;
      card.on('pointerdown', () => { armorPressed = true; });
      card.on('pointerout', () => { armorPressed = false; });
      card.on('pointerup', () => {
        if (!armorPressed) return;
        armorPressed = false;
        this.openEquipmentList(slot);
      });
      this.text(center, 562, labels[slot], 10, COLOR.secondary, true, true);
      if (item) {
        this.add.image(center, 594, ensureArmorIcon(this, item)).setDisplaySize(54, 54);
      } else {
        this.text(center, 593, '+', 27, '#8ca9bf', true, true);
      }
      // Origin is centered on the slot itself, not center - 45.
      this.fittedText(center, 623,
        item ? 'LV.' + item.level + '  ' + '★'.repeat(item.stars) : 'LEEG · KIES',
        10, item ? '#f8d77b' : COLOR.faint, 93, true).setOrigin(.5);
    });
    const bonus = armorBonuses(profile.armorInventory, armor, heroId);
    this.fittedText(37, 679,
      'HP +' + (bonus.hp * 100).toFixed(1) + '%  ·  DEF +' +
      (bonus.defense * 100).toFixed(1) + '%  ·  DMG +' +
      (bonus.weaponDamage * 100).toFixed(1) + '%', 10, '#86efac', 308);
    this.fittedText(37, 699,
      'AANVAL +' + (bonus.attackSpeed * 100).toFixed(1) + '%  ·  SNELHEID +' +
      (bonus.movementSpeed * 100).toFixed(1) + '%', 10, '#86efac', 308);
  }

  private openEquipmentList(slot: EquipmentSlot): void {
    this.equipmentSlot = slot;
    this.equipmentItemId = null;
    this.pendingUpgrade = null;
    this.inventoryTouchStart = null;
    this.inventoryPressedRowId = null;
    this.inventoryOffset = 0;
    this.equipmentView = 'list';
    this.scene.restart();
  }

  /** Equipment uses one continuous list, navigable by wheel, swipe or scrollbar. */
  private equipmentInventoryIds(): string[] {
    const profile = progressStore.current;
    if (this.equipmentSlot === 'weapon') return [...HERO_WEAPONS[this.armorHero]];
    return profile.armorInventory.filter(piece =>
      piece.heroId === this.armorHero && armorDefinition(piece).slot === this.equipmentSlot)
      .sort((a, b) =>
        Number(profile.equippedArmor[this.armorHero][this.equipmentSlot as ArmorSlot] === b.id) -
        Number(profile.equippedArmor[this.armorHero][this.equipmentSlot as ArmorSlot] === a.id))
      .map(piece => piece.id);
  }

  private drawEquipmentList(): void {
    const profile = progressStore.current;
    const ids = this.equipmentInventoryIds();
    const title: Record<EquipmentSlot, string> = {
      weapon: 'WAPENS', helm: 'HELMS', body: 'PANTSERS', boots: 'SCHOENEN',
    };
    const max = inventoryMaxOffset(ids.length);
    this.inventoryOffset = moveInventoryOffset(this.inventoryOffset, 0, ids.length);
    this.section(title[this.equipmentSlot], 'Tik een item aan voor alle stats en acties');
    this.button(84, 338, 101, 37, '‹ TERUG', () => {
      this.equipmentView = 'overview'; this.scene.restart();
    }, 'quiet', false, 11);
    this.fittedText(161, 339, HEROES[this.armorHero].name.toUpperCase() +
      '  ·  ' + ids.length + ' ITEMS', 11, COLOR.secondary, 185, true);

    if (!ids.length) {
      this.text(195, 494, 'Nog geen uitrusting voor dit vak', 12, COLOR.secondary, true);
      this.text(195, 522, 'Versla vijanden om nieuwe items te vinden.', 10, COLOR.faint, true);
    }

    ids.slice(this.inventoryOffset, this.inventoryOffset + EQUIPMENT_VISIBLE_ROWS)
      .forEach((id, index) => {
        const cy = 430 + index * 85;
        const isWeapon = this.equipmentSlot === 'weapon';
        const piece = isWeapon ? undefined : profile.armorInventory.find(x => x.id === id);
        const d = piece ? armorDefinition(piece) : undefined;
        const rarity = piece ? RARITY_CONFIG[piece.rarity] : undefined;
        const weapon = isWeapon ? WEAPONS[id as WeaponId] : undefined;
        const active = piece
          ? profile.equippedArmor[this.armorHero][this.equipmentSlot as ArmorSlot] === id
          : profile.selectedWeapons[this.armorHero] === id;
        const color = rarity?.color ?? weapon?.color ?? COLOR.accent;
        const panel = this.plate(184, cy, 300, 76,
          active ? 0x1b3e49 : COLOR.card, color, 10);
        panel.setInteractive(new Phaser.Geom.Rectangle(0, 0, 300, 76),
          Phaser.Geom.Rectangle.Contains);
        // Detail view requires a new press on this exact row in this list.
        // Releasing the tap that opened the list must never open a detail.
        panel.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.inventoryPressedRowId = id;
          this.inventoryTouchStart = { x: pointer.worldX, y: pointer.worldY };
        });
        panel.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (!isInventoryRowTap(this.inventoryPressedRowId, id,
            this.inventoryTouchStart, { x: pointer.worldX, y: pointer.worldY })) return;
          this.inventoryPressedRowId = null;
          this.inventoryTouchStart = null;
          this.equipmentItemId = id;
          this.equipmentView = 'detail';
          this.scene.restart();
        });
        this.add.circle(68, cy, 25, color, .18).setStrokeStyle(1.5, color);
        if (piece)
          this.add.image(68, cy, ensureArmorIcon(this, piece)).setDisplaySize(56, 56);
        else this.text(68, cy, weapon?.attackMode === 'melee' ? '⚔' : '➶',
          24, COLOR.white, true, true);
        this.fittedText(106, cy - 22, weapon?.name ?? d?.name ?? '', 13,
          COLOR.white, 195, true);
        this.fittedText(106, cy, piece
          ? (rarity?.label ?? '') + '  ·  LV.' + piece.level + '  ' + '★'.repeat(piece.stars)
          : 'LV.' + profile.weaponLevels[id as WeaponId] +
            (profile.unlockedWeapons.includes(id as WeaponId) ? '' : '  ·  GESLOTEN'),
          10, COLOR.secondary, 195);
        this.fittedText(106, cy + 21,
          active ? 'UITGERUST  ✓' : piece ? armorStatText(piece) :
            weapon?.description ?? '', 9, active ? '#86efac' : COLOR.faint, 187);
        this.text(313, cy, '›', 23, '#9cc9d5', true);
      });

    if (max > 0) {
      const rail = this.add.rectangle(349, 515, 5, 245, 0x334960, 0.85);
      rail.setInteractive(new Phaser.Geom.Rectangle(0, 0, 5, 245),
        Phaser.Geom.Rectangle.Contains);
      rail.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const fraction = Math.max(0, Math.min(1, (pointer.worldY - 392) / 245));
        this.inventoryOffset = Math.round(fraction * max);
        this.scene.restart();
      });
      const thumbH = Math.max(26, 245 * EQUIPMENT_VISIBLE_ROWS / ids.length);
      const thumbY = 392 + thumbH / 2 + (245 - thumbH) * (this.inventoryOffset / max);
      this.add.rectangle(349, thumbY, 7, thumbH, COLOR.accent);
    }
    this.button(93, 699, 95, 35, '↑ OMHOOG', () => this.scrollEquipment(-1),
      'quiet', this.inventoryOffset <= 0, 10);
    this.text(195, 699, ids.length
      ? (this.inventoryOffset + 1) + '–' +
        Math.min(ids.length, this.inventoryOffset + EQUIPMENT_VISIBLE_ROWS) + ' / ' + ids.length
      : '0 ITEMS', 10, COLOR.secondary, true);
    this.button(295, 699, 95, 35, 'OMLAAG ↓', () => this.scrollEquipment(1),
      'quiet', this.inventoryOffset >= max, 10);
  }

  private scrollEquipment(delta: number): void {
    const next = moveInventoryOffset(this.inventoryOffset, delta, this.equipmentInventoryIds().length);
    if (next !== this.inventoryOffset) {
      this.inventoryPressedRowId = null;
      this.inventoryOffset = next;
      this.scene.restart();
    }
  }

  private insideEquipmentList(pointer: Phaser.Input.Pointer): boolean {
    return this.tab === 'weapons' && this.equipmentView === 'list' &&
      pointer.worldX >= 33 && pointer.worldX <= 356 &&
      pointer.worldY >= 390 && pointer.worldY <= 674;
  }

  private readonly handleInventoryWheel = (
    pointer: Phaser.Input.Pointer, _over: Phaser.GameObjects.GameObject[],
    _dx: number, dy: number,
  ): void => {
    if (this.insideEquipmentList(pointer) && dy !== 0)
      this.scrollEquipment(Math.sign(dy));
  };

  private readonly handleInventoryTouchStart = (pointer: Phaser.Input.Pointer): void => {
    this.inventoryTouchStart = this.insideEquipmentList(pointer)
      ? { x: pointer.worldX, y: pointer.worldY } : null;
  };

  private readonly handleInventoryTouchEnd = (pointer: Phaser.Input.Pointer): void => {
    const first = this.inventoryTouchStart;
    this.inventoryTouchStart = null;
    this.inventoryPressedRowId = null;
    if (!first || this.equipmentView !== 'list') return;
    const distance = first.y - pointer.worldY;
    if (Math.abs(distance) >= 24 && Math.abs(pointer.worldX - first.x) < 130)
      this.scrollEquipment(Math.sign(distance) * Math.max(1, Math.round(Math.abs(distance) / 60)));
  };

  private drawEquipmentDetail(): void {
    const profile = progressStore.current;
    const id = this.equipmentItemId;
    const weaponId = this.equipmentSlot === 'weapon' ? id as WeaponId | null : null;
    const weapon = weaponId ? WEAPONS[weaponId] : undefined;
    const piece: ArmorItem | undefined = this.equipmentSlot === 'weapon' ? undefined :
      profile.armorInventory.find(item => item.id === id && item.heroId === this.armorHero &&
        armorDefinition(item).slot === this.equipmentSlot);
    if (!piece && !weapon) {
      this.equipmentView = 'list';
      this.drawEquipmentList();
      return;
    }
    const d = piece ? armorDefinition(piece) : undefined;
    const rarity = piece ? RARITY_CONFIG[piece.rarity] : undefined;
    const accent = rarity?.color ?? weapon?.color ?? COLOR.accent;
    const worn = piece
      ? profile.equippedArmor[this.armorHero][d!.slot] === piece.id
      : profile.selectedWeapons[this.armorHero] === weaponId;
    this.section('ITEM DETAILS', 'Bekijk stats en beheer je gekozen uitrusting');
    this.button(87, 337, 109, 36, '‹ LIJST', () => {
      this.pendingUpgrade = null;
      this.equipmentView = 'list'; this.scene.restart();
    }, 'quiet', false, 11);
    this.fittedText(162, 337, HEROES[this.armorHero].name.toUpperCase(), 11,
      COLOR.secondary, 174, true);
    this.plate(195, 474, 328, 226, 0x192e40, accent, 13);
    this.fittedText(48, 381, weapon?.name.toUpperCase() ?? d?.name.toUpperCase() ?? '',
      15, COLOR.white, 294, true);
    this.add.circle(195, 427, 34, accent, .20).setStrokeStyle(2, accent);
    if (piece)
      this.add.image(195, 427, ensureArmorIcon(this, piece)).setDisplaySize(70, 70);
    else
      this.text(195, 427, weapon?.attackMode === 'melee' ? '⚔' : '➶',
        34, COLOR.white, true, true);
    const previewing = piece
      ? this.isConfirmingUpgrade({ type: 'upgradeArmor', id: piece.id }, piece.level)
      : weaponId ? this.isConfirmingUpgrade({ type: 'upgradeWeapon', id: weaponId },
        profile.weaponLevels[weaponId]) : false;
    const currentLevel = piece?.level ?? profile.weaponLevels[weaponId!];
    const maxLevel = piece ? ARMOR_MAX_LEVEL : MAX_WEAPON_LEVEL;
    this.text(195, 468, (piece ? rarity!.label.toUpperCase() : 'WAPEN') +
      '  ·  LV.' + currentLevel + '/' + maxLevel +
      (previewing && currentLevel < maxLevel ? '  →  ' + (currentLevel + 1) + '/' + maxLevel : ''),
      11, COLOR.secondary, true, true);
    this.text(195, 489, piece ? '★'.repeat(piece.stars) + '☆'.repeat(ARMOR_MAX_STARS - piece.stars)
      : 'SCHADE & AANVAL', 14, '#fbd36b', true, true);

    if (piece) {
      const slotEquipped = {
        helm: d!.slot === 'helm' ? piece.id : null,
        body: d!.slot === 'body' ? piece.id : null,
        boots: d!.slot === 'boots' ? piece.id : null,
      };
      const bonus = armorBonuses([piece], slotEquipped, piece.heroId);
      const nextBonus = armorBonuses([{ ...piece, level: Math.min(ARMOR_MAX_LEVEL, piece.level + 1) }],
        slotEquipped, piece.heroId);
      const stats: Array<[string, number, number]> = [
        ['HP', bonus.hp, nextBonus.hp], ['DEFENSE', bonus.defense, nextBonus.defense],
        ['WAPENSCHADE', bonus.weaponDamage, nextBonus.weaponDamage],
        ['AANVALSSNELHEID', bonus.attackSpeed, nextBonus.attackSpeed],
        ['LOOPSNELHEID', bonus.movementSpeed, nextBonus.movementSpeed],
      ];
      stats.filter(([, value]) => value > 0).forEach(([name, value, next], i) => {
        this.text(64, 514 + i * 22, name, 10, COLOR.secondary);
        this.text(321, 514 + i * 22, '+' + (value * 100).toFixed(2) + '%' +
          (previewing ? '  →  +' + (next * 100).toFixed(2) + '%' : ''),
          previewing ? 10 : 12, previewing ? '#fcd34d' : '#86efac').setOrigin(1, .5);
      });
      const canFuse = canFuseArmor(piece, profile.armorInventory, ARMOR_MAX_STARS);
      const cost = armorUpgradeCost(piece);
      this.fittedText(42, 598, previewing
        ? 'BEVESTIG UPGRADE  ·  KOST ' + cost + ' G'
        : canFuse ? 'FUSION: 1 dubbel item wordt verbruikt voor +1 ★'
        : piece.stars === ARMOR_MAX_STARS ? 'Maximum aantal sterren bereikt'
          : 'Fusion vereist 2 gelijke items met dezelfde sterren',
        10, previewing || canFuse ? '#fbd36b' : COLOR.faint, 309);
      this.button(110, 642, 153, 43, worn ? 'UITDOEN' : 'SELECTEREN', () => this.runAction(
        worn ? { type: 'unequipArmor', heroId: this.armorHero, slot: d!.slot }
          : { type: 'equipArmor', id: piece.id }), worn ? 'quiet' : 'selected', false, 11);
      this.button(280, 642, 153, 43,
        piece.level >= ARMOR_MAX_LEVEL ? 'MAX LEVEL' : previewing ? 'CONFIRM' : 'UPGRADE ' + cost + ' G',
        () => this.requestUpgrade({ type: 'upgradeArmor', id: piece.id }, piece.level),
        previewing ? 'selected' : 'normal',
        piece.level >= ARMOR_MAX_LEVEL || profile.gold < cost, 10);
      this.button(110, 694, 153, 43, '‹ TERUG', () => {
        this.pendingUpgrade = null;
        this.equipmentView = 'list'; this.scene.restart();
      }, 'quiet', false, 11);
      this.button(280, 694, 153, 43, 'FUSION +1 ★', () =>
        this.runAction({ type: 'fuseArmor', id: piece.id }), 'selected', !canFuse, 11);
    } else if (weapon && weaponId) {
      const level = profile.weaponLevels[weaponId];
      const stats = getWeaponStats(weaponId, level);
      const next = getWeaponStats(weaponId, Math.min(MAX_WEAPON_LEVEL, level + 1));
      const rows: Array<[string, string, string]> = [
        ['SCHADE', stats.damage.toFixed(1), next.damage.toFixed(1)],
        ['AANVALLEN PER SEC', (1000 / weaponBaseAttackIntervalMs(stats)).toFixed(2),
          (1000 / weaponBaseAttackIntervalMs(next)).toFixed(2)],
        [stats.attackMode === 'melee' ? 'BEREIK' : 'PROJECTIELEN',
          String(stats.attackMode === 'melee' ? stats.meleeRange : stats.projectileCount),
          String(next.attackMode === 'melee' ? next.meleeRange : next.projectileCount)],
      ];
      rows.forEach(([name, current, future], i) => {
        const y = 518 + i * 22;
        this.text(65, y, name, 10, COLOR.secondary);
        this.text(321, y, current + (previewing ? '  →  ' + future : ''),
          previewing ? 11 : 12, previewing ? '#fcd34d' : '#86efac').setOrigin(1, .5);
      });
      this.fittedText(42, 596, previewing
        ? 'BEVESTIG UPGRADE  ·  KOST ' + weaponUpgradeCost(level) + ' G'
        : weapon.description, 10, previewing ? '#fcd34d' : COLOR.faint, 309);
      const unlocked = profile.unlockedWeapons.includes(weaponId);
      const cost = weaponUpgradeCost(level);
      this.button(110, 642, 153, 43, worn ? 'ACTIEF' : unlocked ? 'SELECTEREN' : 'SLOT',
        () => {
          if (profile.selectedHero !== this.armorHero)
            progressStore.dispatch({ type: 'selectHero', id: this.armorHero });
          this.runAction({ type: 'selectWeapon', id: weaponId });
        }, worn ? 'selected' : 'normal', worn || !unlocked, 11);
      this.button(280, 642, 153, 43,
        level >= MAX_WEAPON_LEVEL ? 'MAX LEVEL' : previewing ? 'CONFIRM' : 'UPGRADE ' + cost + ' G',
        () => this.requestUpgrade({ type: 'upgradeWeapon', id: weaponId }, level),
        previewing ? 'selected' : 'normal',
        !unlocked || level >= MAX_WEAPON_LEVEL || profile.gold < cost, 10);
      this.button(110, 694, 153, 43, '‹ TERUG', () => {
        this.pendingUpgrade = null;
        this.equipmentView = 'list'; this.scene.restart();
      }, 'quiet', false, 11);
      this.button(280, 694, 153, 43, 'GEEN WAPENFUSION', () => {},
        'quiet', true, 9);
    }
  }

  /** Decorative chest previews. They have NO clicks, gold costs or loot logic yet. */
  private drawShop(): void {
    this.section('SHOP', '');
    SHOP_CHESTS.forEach((chest, index) => {
      const y = 381 + index * 122;
      this.plate(195, y, 328, 112, index === 0 ? 0x292536 :
        index === 1 ? 0x172f43 : 0x39283b, chest.trim, 13);
      this.drawChest(96, y - 2, chest);
      this.fittedText(148, y - 33, chest.name, 14, COLOR.white, 185, true);
      this.fittedText(148, y - 11, chest.tier + ' · ' + chest.caption, 10,
        '#' + chest.trim.toString(16).padStart(6, '0'), 186);
      this.plate(232, y + 28, 168, 25, 0x172638, 0x50617a, 8);
      this.text(232, y + 28, 'BINNENKORT', 10, COLOR.secondary, true, true);
    });
  }

  /** Chest illustration with shaded hinged lid, bands, latch and rarity trim. */
  private drawChest(x: number, y: number, chest: ShopChest): void {
    const g = this.add.graphics().setPosition(x, y).setScale(chest.scale);
    g.fillStyle(0x020617, .35);
    g.fillEllipse(0, 41, 92, 16);
    g.fillStyle(0x121a2a, 1);
    g.fillRoundedRect(-43, -18, 86, 56, 8);
    g.fillStyle(chest.color, 1);
    g.fillRoundedRect(-38, -15, 76, 47, 5);
    g.lineStyle(3, chest.trim, .96);
    g.strokeRoundedRect(-38, -15, 76, 47, 5);
    g.fillStyle(chest.color, 1);
    g.fillRoundedRect(-44, -37, 88, 30, 10);
    g.lineStyle(4, chest.trim, 1);
    g.strokeRoundedRect(-44, -37, 88, 30, 10);
    g.lineStyle(2, 0xffffff, .22);
    g.lineBetween(-34, -27, 34, -27);
    g.fillStyle(chest.trim, .85);
    g.fillRoundedRect(-28, -31, 7, 59, 2);
    g.fillRoundedRect(21, -31, 7, 59, 2);
    g.lineStyle(2, 0x080f1a, .65);
    g.lineBetween(-34, 20, 34, 20);
    g.fillStyle(0x142031, 1);
    g.fillRoundedRect(-11, -15, 22, 28, 5);
    g.lineStyle(3, chest.trim, 1);
    g.strokeRoundedRect(-11, -15, 22, 28, 5);
    if (chest.id === 'small') {
      g.fillStyle(0xd3bd9a, 1); g.fillCircle(0, -3, 4);
      g.fillStyle(0x3b2a20, 1); g.fillCircle(0, -2, 1.7);
    } else {
      const gem = chest.id === 'medium' ? 0x7ee9ff : 0xff69ad;
      g.fillStyle(gem, .96);
      g.fillTriangle(0, -12, 8, -2, -8, -2);
      g.fillTriangle(0, 10, 8, -2, -8, -2);
      g.lineStyle(1.3, 0xfef9c3, .8);
      g.lineBetween(0, -10, 0, 8);
      if (chest.id === 'large') {
        g.lineStyle(3, 0xffdc81, .95);
        g.lineBetween(-33, -40, -25, -51);
        g.lineBetween(-25, -51, -14, -42);
        g.lineBetween(33, -40, 25, -51);
        g.lineBetween(25, -51, 14, -42);
        g.fillStyle(0xfff4ae, .9);
        for (const dx of [-36, -17, 18, 35]) g.fillCircle(dx, -44, 2.4);
      } else {
        g.lineStyle(2, 0x9df4ff, .7);
        g.strokeCircle(0, -24, 10);
      }
    }
    if (chest.id !== 'small') {
      g.fillStyle(chest.id === 'large' ? 0xffeaa2 : 0xa9f3ff, .77);
      g.fillCircle(-40, -42, 2.1);
      g.fillCircle(41, -31, 1.8);
    }
  }

  private drawSettings(): void {
    const profile = progressStore.current;
    this.section('INSTELLINGEN', 'Beheer je voortgang en voorkeuren');
    this.plate(195, 348, 328, 76, COLOR.card, COLOR.border, 11);
    this.text(46, 322, 'AVONTURENPROFIEL', 10, COLOR.faint);
    this.text(46, 344, 'Hoogste kamer bereikt', 12, COLOR.secondary);
    this.text(337, 344, profile.highestRoom + ' / ' + CHAPTER_ROOM_COUNT, 16, '#7dd3fc', true, true);
    this.text(46, 365, 'Totaal verdiend: ' + profile.totalGoldEarned + ' G · lokaal opgeslagen', 10, COLOR.faint);

    this.button(195, 435, 328, 49,
      'MUZIEK   ·   ' + (profile.settings.musicEnabled ? 'AAN' : 'UIT'), () => this.runAction({
        type: 'setSetting', key: 'musicEnabled', value: !profile.settings.musicEnabled,
      }), 'normal');
    this.button(195, 493, 328, 49,
      'GELUIDSEFFECTEN   ·   ' + (profile.settings.sfxEnabled ? 'AAN' : 'UIT'), () => this.runAction({
        type: 'setSetting', key: 'sfxEnabled', value: !profile.settings.sfxEnabled,
      }), 'normal');
    this.text(195, 528, 'Audioweergave wordt toegevoegd in fase 9', 10, COLOR.faint, true);
    this.button(195, 569, 328, 53, '⌨   TOETSENBORD & BESTURING   ›', () => {
      this.settingsView = 'controls';
      this.notice = '';
      this.scene.restart();
    }, 'selected', false, 13);

    if (this.resetRequested) {
      this.text(195, 616, 'Alle voortgang en instellingen permanent wissen?', 10, '#fca5a5', true);
      this.button(113, 658, 156, 39, 'JA, WISSEN', () => {
        progressStore.reset();
        this.resetRequested = false;
        this.scene.restart();
      }, 'danger');
      this.button(276, 658, 156, 39, 'ANNULEREN', () => {
        this.resetRequested = false;
        this.scene.restart();
      }, 'normal');
    } else {
      this.button(195, 657, 328, 43, 'VOORTGANG RESETTEN', () => {
        this.resetRequested = true;
        this.scene.restart();
      }, 'quiet');
    }
  }

  private drawControls(): void {
    this.button(70, 265, 80, 29, '‹ TERUG', () => {
      this.awaitingKey = undefined;
      this.notice = '';
      this.settingsView = 'general';
      this.scene.restart();
    }, 'quiet', false, 10);
    this.text(199, 265, 'BESTURING', 15, COLOR.white, true, true);
    this.text(195, 294,
      this.awaitingKey ? 'DRUK TOETS OF MUISKNOP  ·  ESC ANNULEERT' :
        'Klik een actie en druk een toets of muisknop', 11, this.awaitingKey ? '#fcd34d' : COLOR.secondary, true);

    const bindings = progressStore.current.settings.keyBindings;
    CONTROL_ACTIONS.forEach((action, index) => {
      const y = 322 + index * 43;
      const awaiting = action === this.awaitingKey;
      const skill = index >= 5;
      this.plate(195, y, 328, 39, awaiting ? 0x173f50 : COLOR.card,
        awaiting ? 0x67e8f9 : COLOR.border, 9);
      this.text(43, y - 12, CONTROL_LABELS[action].toUpperCase(),
        12, COLOR.white, false, true);
      this.text(43, y + 5, skill ? 'KRACHT' : 'BEWEGING', 9,
        skill ? '#fbbf24' : COLOR.faint);
      this.button(295, y, 107, 30, awaiting ? 'TOETS...' : formatBinding(bindings[action]),
        () => {
          this.awaitingKey = action;
          this.notice = '';
          this.scene.restart();
        }, awaiting ? 'selected' : 'normal', false, 11);
    });

    if (this.notice) this.text(195, 657, this.notice, 10, '#fcd34d', true);
    this.button(195, 689, 324, 33, 'STANDAARDTOETSEN HERSTELLEN', () => {
      this.awaitingKey = undefined;
      this.notice = 'Standaardbesturing hersteld';
      this.runAction({ type: 'resetKeyBindings' });
    }, 'quiet', false, 10);
  }

  private readonly preventCaptureContextMenu = (event: MouseEvent): void => {
    if (this.awaitingKey || this.suppressNextContextMenu) event.preventDefault();
    this.suppressNextContextMenu = false;
  };

  private readonly captureMouseButton = (event: PointerEvent): void => {
    if (!this.awaitingKey || event.pointerType !== 'mouse' ||
      !(event.target instanceof Node) || !this.game.canvas.contains(event.target)) return;
    const key = mouseButtonKey(event.button);
    if (!key) return;
    if (event.button === 2) this.suppressNextContextMenu = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.applyCapturedInput(key);
  };

  private readonly captureBinding = (event: KeyboardEvent): void => {
    if (!this.awaitingKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (event.key === 'Escape') {
      this.awaitingKey = undefined;
      this.notice = 'Wijziging geannuleerd';
      this.scene.restart();
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      this.notice = 'Gebruik geen Ctrl, Alt of Command';
      this.scene.restart();
      return;
    }
    const key = normalizeBindKey(event.key);
    if (!key) {
      this.notice = 'Gebruik letters, cijfers, pijlen, spatie of muisknop';
      this.scene.restart();
      return;
    }
    this.applyCapturedInput(key);
  };

  private applyCapturedInput(key: string): void {
    const action = this.awaitingKey;
    if (!action) return;
    const result = rebindKey(progressStore.current.settings.keyBindings, action, key);
    if (!result.ok) {
      this.notice = result.reason === 'conflict' && result.action
        ? 'Toets in gebruik door: ' + CONTROL_LABELS[result.action]
        : 'Deze toets is niet toegestaan';
      this.scene.restart();
      return;
    }
    this.awaitingKey = undefined;
    this.notice = CONTROL_LABELS[action] + ' ingesteld op ' + formatBinding([key]);
    progressStore.dispatch({ type: 'rebindKey', action, key });
    this.scene.restart();
  };

  private section(title: string, _subtitle: string): void {
    // Section titles remain, but repetitive instructional subtitles are removed.
    this.add.rectangle(39, 278, 3, 23, COLOR.accent, 0.9);
    this.fittedText(52, 278, title, 16, COLOR.white, 285, true);
    this.add.rectangle(195, 307, 306, 1, COLOR.border, 0.7);
  }

  /** Keep all card labels inside their own available width on small screens. */
  private fittedText(x: number, y: number, value: string, size: number,
    color: string, maxWidth: number, bold = false): Phaser.GameObjects.Text {
    const label = this.text(x, y, value, size, color, false, bold);
    if (label.width <= maxWidth) return label;
    let keep = Math.min(value.length - 1,
      Math.floor(value.length * maxWidth / label.width) - 1);
    keep = Math.max(2, keep);
    label.setText(value.slice(0, keep).trimEnd() + '…');
    while (label.width > maxWidth && keep > 2) {
      keep -= 1;
      label.setText(value.slice(0, keep).trimEnd() + '…');
    }
    return label;
  }

  private text(x: number, y: number, value: string, size: number, color: string,
    centered = false, bold = false): Phaser.GameObjects.Text {
    return this.add.text(x, y, value, {
      fontFamily: FONT, fontSize: size + 'px', fontStyle: bold ? 'bold' : 'normal', color,
    }).setOrigin(centered ? 0.5 : 0, 0.5);
  }

  private plate(cx: number, cy: number, width: number, height: number,
    fill: number, stroke: number, radius: number): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setPosition(cx - width / 2, cy - height / 2);
    graphics.fillStyle(fill, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.lineStyle(1, stroke, 1);
    graphics.strokeRoundedRect(0, 0, width, height, radius);
    return graphics;
  }

  private button(x: number, y: number, width: number, height: number, label: string,
    action: () => void, style: ButtonStyle = 'normal', disabled = false,
    fontSize = 12): void {
    const colors: Record<ButtonStyle, [number, number, string]> = {
      normal: [0x253a53, 0x506986, '#f1f5fb'],
      selected: [0x125771, 0x67e8f9, '#f4feff'],
      primary: [0x0891b2, 0x67e8f9, '#ffffff'],
      danger: [0x823040, 0xfb7185, '#fff1f2'],
      quiet: [0x17283b, 0x344a63, '#b6c8db'],
    };
    const [fill, stroke, textColor] = disabled
      ? [0x19273a, 0x293b52, '#657992'] as const : colors[style];
    const radius = Math.min(11, height / 4);
    const graphic = this.add.graphics().setPosition(x - width / 2, y - height / 2);
    const render = (hovered: boolean) => {
      graphic.clear();
      graphic.fillStyle(hovered ? Phaser.Display.Color.ValueToColor(fill).brighten(10).color : fill);
      graphic.fillRoundedRect(0, 0, width, height, radius);
      graphic.lineStyle(style === 'primary' ? 2 : 1, stroke, 1);
      graphic.strokeRoundedRect(0, 0, width, height, radius);
    };
    render(false);
    this.text(x, y, label, fontSize, textColor, true, true);
    if (!disabled) {
      graphic.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height),
        Phaser.Geom.Rectangle.Contains);
      graphic.on('pointerover', () => render(true));
      graphic.on('pointerout', () => render(false));
      graphic.on('pointerdown', action);
    }
  }
}

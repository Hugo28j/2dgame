import Phaser from 'phaser';
import { GAME_SCENE_KEY, GAME_WIDTH, MENU_SCENE_KEY } from '../config/constants';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { WORLDS, isWorldUnlocked, getWorld } from '../worlds/worldConfig';
import {
  HERO_IDS, HEROES, getHeroStats, heroUpgradeCost, MAX_HERO_LEVEL,
} from '../heroes/heroConfig';
import { progressStore, type ProfileAction } from '../progression/ProgressStore';
import {
  CONTROL_ACTIONS, CONTROL_LABELS, formatBinding, mouseButtonKey, normalizeBindKey, rebindKey,
  type ControlAction,
} from '../input/keyBindings';
import {
  MAX_PERMANENT_LEVEL, PERMANENT_UPGRADE_IDS, PERMANENT_UPGRADES, permanentUpgradeCost,
} from '../progression/economy';
import {
  HERO_WEAPONS, WEAPONS, getWeaponStats,
  weaponUpgradeCost, MAX_WEAPON_LEVEL,
} from '../weapons/weaponConfig';
import {
  ABILITIES, HERO_ABILITIES, MAX_ABILITY_LEVEL, abilityUpgradeCost, getAbilityStats,
  isAbilityUnlocked,
} from '../abilities/abilityConfig';
import { abilityMenuSummary, equipmentForHero } from '../ui/menuPresentation';

type MenuTab = 'worlds' | 'heroes' | 'weapons' | 'upgrades' | 'settings';
type ButtonStyle = 'normal' | 'selected' | 'primary' | 'danger' | 'quiet';
const FONT = 'system-ui, sans-serif';
const COLOR = {
  background: 0x090f19, panel: 0x111e2d, card: 0x192a3b,
  border: 0x304459, accent: 0x58d4eb, gold: 0xfbbf24, muted: 0x9daec5,
  white: '#f5f9ff', secondary: '#b9c9d8', faint: '#899bad',
} as const;

export class MainMenuScene extends Phaser.Scene {
  private tab: MenuTab = 'worlds';
  private heroPage = 0;
  private upgradeCategory: 'equipment' | 'abilities' | 'permanent' = 'permanent';
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
    else if (this.tab === 'heroes') this.drawHeroes();
    else if (this.tab === 'weapons') this.drawWeapons();
    else if (this.tab === 'upgrades') this.drawUpgrades();
    else if (this.settingsView === 'controls') this.drawControls();
    else this.drawSettings();

    this.button(195, 766, 342, 60, '▶   START AVONTUUR',
      () => this.scene.start(GAME_SCENE_KEY), 'primary', false, 17);
    this.text(195, 810, getWorld(progressStore.current.selectedWorld).name.toUpperCase() +
      '  ·  KAMER 1–50', 11, COLOR.secondary, true);

    this.input.keyboard?.on('keydown', this.captureBinding);
    // Capture before Phaser delivers game-object clicks; the click that opens
    // the remap modal is not captured because awaitingKey is still undefined.
    window.addEventListener('pointerdown', this.captureMouseButton, true);
    window.addEventListener('contextmenu', this.preventCaptureContextMenu, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.captureBinding);
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
    this.add.image(55, 147, hero.textureKey).setDisplaySize(45, 45);
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
      10, COLOR.secondary, true);
  }

  private drawNavigation(): void {
    const tabs: Array<[MenuTab, string]> = [
      ['worlds', 'WERELDEN'], ['heroes', 'HELDEN'], ['weapons', 'WAPENS'],
      ['upgrades', 'UPGRADES'], ['settings', 'OPTIES'],
    ];
    tabs.forEach(([tab, label], index) => {
      const x = 42 + index * 76.5;
      const active = this.tab === tab;
      this.button(x, 227, 72, 42, label, () => this.chooseTab(tab),
        active ? 'selected' : 'quiet', false, 9);
      if (active) this.add.rectangle(x, 247, 38, 3, COLOR.accent, 0.9);
    });
  }

  private chooseTab(tab: MenuTab): void {
    this.tab = tab;
    if (tab === 'heroes') this.heroPage = Math.floor(
      Math.max(0, HERO_IDS.indexOf(progressStore.current.selectedHero)) / 4);
    if (tab !== 'settings') this.settingsView = 'general';
    this.resetRequested = false;
    this.awaitingKey = undefined;
    this.notice = '';
    this.scene.restart();
  }

  private runAction(action: ProfileAction): void {
    progressStore.dispatch(action);
    this.scene.restart();
  }

  private drawWorlds(): void {
    this.section('KIES JE WERELD', 'Voltooi kamer 50 om de volgende wereld te openen');
    const profile = progressStore.current;
    WORLDS.forEach(world => {
      const y = 346 + (world.id - 1) * 75;
      const unlocked = isWorldUnlocked(world.id, profile.completedWorlds);
      const selected = world.id === profile.selectedWorld;
      const best = profile.worldBestRooms[world.id - 1] ?? 1;
      this.plate(195, y, 328, 70, selected ? 0x1a3944 : COLOR.card,
        selected ? world.accent : COLOR.border, 11);
      this.add.circle(52, y - 15, 13, world.accent, unlocked ? 0.95 : 0.23);
      this.text(52, y - 15, String(world.id), 12,
        unlocked ? '#07131f' : COLOR.faint, true, true);
      this.fittedText(75, y - 20, world.name.toUpperCase(), 13,
        unlocked ? COLOR.white : COLOR.faint, 194, true);
      this.fittedText(75, y - 2, world.subtitle, 10,
        unlocked ? COLOR.secondary : COLOR.faint, 193);
      if (unlocked) {
        this.text(75, y + 17, (best >= CHAPTER_ROOM_COUNT ? 'VOLTOOID' :
          'BESTE KAMER ' + best + '/' + CHAPTER_ROOM_COUNT), 9,
        best >= CHAPTER_ROOM_COUNT ? '#86efac' : COLOR.secondary);
        this.add.rectangle(161, y + 29, 173, 4, 0x304459);
        this.add.rectangle(74, y + 29, 173 * Math.min(1, best / CHAPTER_ROOM_COUNT), 4,
          world.accent).setOrigin(0, 0.5);
      } else {
        this.text(75, y + 18, 'EERST VORIGE WERELD VOLTOOIEN', 9, COLOR.faint);
      }
      this.button(317, y + 5, 70, 36, selected ? 'ACTIEF' : unlocked ? 'KIES' : 'SLOT',
        () => this.runAction({ type: 'selectWorld', id: world.id }),
        selected ? 'selected' : 'normal', selected || !unlocked, 10);
    });
    this.text(195, 705, 'TOTAAL VERDIEND  ·  ' +
      profile.totalGoldEarned.toLocaleString('nl-BE') + ' G',
      11, '#fcd34d', true, true);
  }

  private drawHeroes(): void {
    this.section('KIES JE HELD', 'Bekijk vaardigheden en kies met wie je speelt');
    const profile = progressStore.current;
    const pageSize = 4;
    const pages = Math.ceil(HERO_IDS.length / pageSize);
    this.heroPage = Math.max(0, Math.min(this.heroPage, pages - 1));
    HERO_IDS.slice(this.heroPage * pageSize, (this.heroPage + 1) * pageSize).forEach((id, index) => {
      const hero = HEROES[id];
      const y = 347 + index * 91;
      const unlocked = profile.unlockedHeroes.includes(id);
      const available = isWorldUnlocked(hero.requiredWorld, profile.completedWorlds);
      const selected = profile.selectedHero === id;
      this.plate(195, y, 328, 85,
        selected ? 0x1b3844 : COLOR.card, selected ? hero.color : COLOR.border, 11);
      this.add.circle(61, y - 15, 24, hero.color, 0.15);
      this.add.image(61, y - 15, hero.textureKey).setDisplaySize(47, 47);
      this.fittedText(93, y - 29, hero.name.toUpperCase(), 13, COLOR.white, 179, true);
      this.fittedText(93, y - 10, 'LV.' + profile.heroLevels[id] +
        '  ·  ' + hero.description, 10, COLOR.secondary, 228);
      this.fittedText(44, y + 11, 'PASSIEF: ' + hero.passive, 10, '#fcd34d', 282);
      const stats = getHeroStats(id, profile.heroLevels[id]);
      this.fittedText(44, y + 30, 'HP ' + stats.maxHp +
        '   ·   SCHADE ' + stats.damage + '   ·   DEF ' + stats.defense,
        10, COLOR.secondary, 204);
      const label = selected ? 'ACTIEF' : unlocked ? 'KIES' :
        !available ? 'WERELD ' + hero.requiredWorld : hero.unlockCost + ' G';
      this.button(313, y + 26, 86, 31, label, () => this.runAction(
        unlocked ? { type: 'selectHero', id } : { type: 'unlockHero', id },
      ), selected ? 'selected' : 'normal',
      selected || (!unlocked && (!available || profile.gold < hero.unlockCost)), 10);
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

  private drawWeapons(): void {
    const profile = progressStore.current;
    const hero = HEROES[profile.selectedHero];
    this.section('WAPENS VAN ' + hero.name.toUpperCase(),
      'Kies een wapen. Beide zijn exclusief voor deze held.');
    HERO_WEAPONS[profile.selectedHero].forEach((id, index) => {
      const weapon = WEAPONS[id];
      const y = 392 + index * 161;
      const unlocked = profile.unlockedWeapons.includes(id);
      const selected = profile.selectedWeapon === id;
      const stats = getWeaponStats(id, profile.weaponLevels[id]);
      this.plate(195, y, 328, 140, selected ? 0x193744 : COLOR.card,
        selected ? COLOR.accent : COLOR.border, 12);
      this.add.circle(62, y - 42, 25, weapon.color, 0.15)
        .setStrokeStyle(2, weapon.color, 0.9);
      this.text(62, y - 45, weapon.attackMode === 'melee' ? '⚔' : '➶', 22,
        COLOR.white, true, true);
      this.fittedText(100, y - 54, weapon.name.toUpperCase(), 14, COLOR.white, 222, true);
      this.fittedText(100, y - 32, weapon.description, 10, COLOR.secondary, 219);
      this.add.rectangle(195, y - 10, 300, 1, COLOR.border, 0.8);
      this.text(44, y + 9, 'LEVEL ' + profile.weaponLevels[id] +
        '  ·  ' + (weapon.attackMode === 'melee' ? 'SLAGWAPEN' : 'AFSTANDSWAPEN'),
        10, COLOR.faint);
      this.text(44, y + 31, 'SCHADE ' + stats.damage, 12, '#fde68a', false, true);
      this.text(158, y + 31, 'TEMPO ' + stats.fireRate.toFixed(2) + '/S',
        10, COLOR.secondary);
      const label = selected ? 'ACTIEF' : unlocked ? 'KIES WAPEN' : weapon.unlockCost + ' G';
      this.button(290, y + 54, 112, 30, label, () => this.runAction(
        unlocked ? { type: 'selectWeapon', id } : { type: 'unlockWeapon', id },
      ), selected ? 'selected' : 'normal',
      selected || (!unlocked && profile.gold < weapon.unlockCost), 10);
      if (weapon.unlockCost === 0) this.text(44, y + 56, 'STARTWAPEN', 10, '#86efac');
      else if (!unlocked) this.text(44, y + 56, 'ONTGRENDEL VOOR ' + weapon.unlockCost + ' G',
        9, COLOR.faint);
    });
    this.text(195, 705, 'Andere wapens? Kies eerst een held bij HELDEN.',
      10, COLOR.secondary, true);
  }

  private drawUpgrades(): void {
    this.button(72, 276, 105, 34, 'PERMANENT', () => this.setUpgradeCategory('permanent'),
      this.upgradeCategory === 'permanent' ? 'selected' : 'quiet', false, 11);
    this.button(195, 276, 132, 34, 'HELD & WAPEN', () => this.setUpgradeCategory('equipment'),
      this.upgradeCategory === 'equipment' ? 'selected' : 'quiet', false, 11);
    this.button(320, 276, 108, 34, 'ABILITIES', () => this.setUpgradeCategory('abilities'),
      this.upgradeCategory === 'abilities' ? 'selected' : 'quiet', false, 11);

    const profile = progressStore.current;
    const rows: Array<{ label: string; description: string; level: number; unlocked: boolean;
      max: number; cost: number; action: ProfileAction }> = this.upgradeCategory === 'permanent'
      ? PERMANENT_UPGRADE_IDS.map(id => ({
          label: PERMANENT_UPGRADES[id].name, description: PERMANENT_UPGRADES[id].description,
          level: profile.permanentLevels[id], unlocked: true, max: MAX_PERMANENT_LEVEL,
          cost: permanentUpgradeCost(id, profile.permanentLevels[id]),
          action: { type: 'upgradePermanent', id } as const,
        }))
      : this.upgradeCategory === 'abilities'
      ? HERO_ABILITIES[profile.selectedHero].map(id => {
          const ability = ABILITIES[id];
          const unlocked = isAbilityUnlocked(id, profile.heroLevels[profile.selectedHero]);
          const stats = getAbilityStats(id, profile.abilityLevels[id]);
          const effect = ability.kind === 'dash'
            ? 'SNELH. ' + stats.dashSpeed + ' · CD ' + (stats.cooldownMs / 1000).toFixed(1) + 'S'
            : ability.kind === 'heal'
            ? stats.heal + ' HP · SCHILD ' + (stats.invulnerabilityMs / 1000).toFixed(1) + 'S'
            : ability.kind === 'drain'
            ? stats.damage + ' DMG · ' + stats.heal + ' HP'
            : ability.kind === 'slow'
            ? stats.damage + ' DMG · ' + Math.round((1 - stats.slowFactor) * 100) + '% TRAAG'
            : stats.damage + ' DMG · R' + stats.radius;
          return {
            label: ability.name,
            description: unlocked ? ability.description + ' · ' + effect :
              'Ontgrendelt op heldlevel ' + ability.unlockLevel,
            level: profile.abilityLevels[id], unlocked, max: MAX_ABILITY_LEVEL,
            cost: abilityUpgradeCost(profile.abilityLevels[id]),
            action: { type: 'upgradeAbility', id } as const,
          };
        })
      : [
          ...HERO_IDS.map(id => ({
            label: HEROES[id].name, description: 'Held verbeteren', level: profile.heroLevels[id],
            unlocked: profile.unlockedHeroes.includes(id), max: MAX_HERO_LEVEL,
            cost: heroUpgradeCost(profile.heroLevels[id]),
            action: { type: 'upgradeHero', id } as const,
          })),
          ...WEAPON_IDS.map(id => ({
            label: WEAPONS[id].name, description: HEROES[WEAPONS[id].heroId].name + ' · wapen verbeteren', level: profile.weaponLevels[id],
            unlocked: profile.unlockedWeapons.includes(id) &&
              profile.unlockedHeroes.includes(WEAPONS[id].heroId), max: MAX_WEAPON_LEVEL,
            cost: weaponUpgradeCost(profile.weaponLevels[id]),
            action: { type: 'upgradeWeapon', id } as const,
          })),
        ];

    const compact = this.upgradeCategory === 'equipment';
    const pageSize = 8;
    const pages = compact ? Math.ceil(rows.length / pageSize) : 1;
    this.upgradePage = Math.max(0, Math.min(this.upgradePage, pages - 1));
    const visibleRows = compact ? rows.slice(this.upgradePage * pageSize,
      (this.upgradePage + 1) * pageSize) : rows;
    visibleRows.forEach((row, index) => {
      const y = compact ? 330 + index * 45 : 347 + index * 67;
      const height = compact ? 41 : 61;
      this.plate(195, y, 330, height, COLOR.card, COLOR.border, 9);
      this.text(43, y - (compact ? 14 : 21), row.label.toUpperCase(),
        compact ? 11 : 13, COLOR.white, false, true);
      if (!compact) this.text(43, y - 2, row.description, 10, COLOR.secondary);
      this.text(43, y + (compact ? 6 : 16), 'NIVEAU ' + row.level + '/' + row.max,
        10, COLOR.faint);
      const label = !row.unlocked ? 'LOCKED' : row.level >= row.max ? 'MAX' : row.cost + ' G';
      this.button(307, y + (compact ? 0 : 7), 89, 30, label, () => this.runAction(row.action),
        'normal', !row.unlocked || row.level >= row.max || profile.gold < row.cost, 10);
    });
    if (compact && pages > 1) {
      this.button(99, 700, 111, 28, '‹ VORIGE', () => {
        this.upgradePage = Math.max(0, this.upgradePage - 1);
        this.scene.restart();
      }, 'quiet', this.upgradePage === 0, 10);
      this.text(195, 700, (this.upgradePage + 1) + '/' + pages, 11, COLOR.secondary, true);
      this.button(292, 700, 111, 28, 'VOLGENDE ›', () => {
        this.upgradePage = Math.min(pages - 1, this.upgradePage + 1);
        this.scene.restart();
      }, 'quiet', this.upgradePage === pages - 1, 10);
    }
  }

  private setUpgradeCategory(category: 'equipment' | 'abilities' | 'permanent'): void {
    this.upgradeCategory = category;
    this.upgradePage = 0;
    this.scene.restart();
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

  private section(title: string, subtitle: string): void {
    this.text(44, 257, title, 17, COLOR.white, false, true);
    this.text(44, 280, subtitle, 10, COLOR.secondary);
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

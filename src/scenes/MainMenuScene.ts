import Phaser from 'phaser';
import { GAME_SCENE_KEY, MENU_SCENE_KEY } from '../config/constants';
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
  WEAPON_IDS, WEAPONS, getWeaponStats, weaponUpgradeCost, MAX_WEAPON_LEVEL,
} from '../weapons/weaponConfig';

type MenuTab = 'heroes' | 'weapons' | 'upgrades' | 'settings';
type ButtonStyle = 'normal' | 'selected' | 'primary' | 'danger' | 'quiet';
const FONT = 'system-ui, sans-serif';
const COLOR = {
  background: 0x080f1c, panel: 0x101e30, card: 0x16263b,
  border: 0x2b405a, accent: 0x38bdf8, gold: 0xfbbf24, muted: 0x9daec5,
  white: '#f4f8ff', secondary: '#a6b8ce', faint: '#7487a0',
} as const;

export class MainMenuScene extends Phaser.Scene {
  private tab: MenuTab = 'heroes';
  private upgradeCategory: 'equipment' | 'permanent' = 'permanent';
  private settingsView: 'general' | 'controls' = 'general';
  private resetRequested = false;
  private awaitingKey?: ControlAction;
  private notice = '';

  public constructor() { super(MENU_SCENE_KEY); }

  public create(): void {
    this.drawBackground();
    this.drawHeader();
    this.drawNavigation();
    this.plate(195, 478, 354, 474, COLOR.panel, COLOR.border, 17);

    if (this.tab === 'heroes') this.drawHeroes();
    else if (this.tab === 'weapons') this.drawWeapons();
    else if (this.tab === 'upgrades') this.drawUpgrades();
    else if (this.settingsView === 'controls') this.drawControls();
    else this.drawSettings();

    this.button(195, 763, 340, 61, '▶   SPELEN', () => this.scene.start(GAME_SCENE_KEY), 'primary', false, 22);
    this.text(195, 807, '20 KAMERS  ·  4 BOSSEN  ·  ELKE RUN IS ANDERS', 10, COLOR.faint, true);

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
    this.cameras.main.setBackgroundColor('#080f1c');
    this.add.rectangle(195, 422, 390, 844, COLOR.background);
    this.add.circle(355, 47, 170, 0x12395a, 0.2);
    this.add.circle(0, 746, 182, 0x12435e, 0.14);
    const grid = this.add.graphics().setAlpha(0.11);
    grid.lineStyle(1, 0x355879, 1);
    for (let x = 0; x <= 390; x += 30) grid.lineBetween(x, 0, x, 844);
    for (let y = 0; y <= 844; y += 30) grid.lineBetween(0, y, 390, y);
    this.add.rectangle(195, 2, 390, 4, COLOR.accent, 0.7);
  }

  private drawHeader(): void {
    // Simple original geometric crest; no external assets or fonts needed.
    const crest = this.add.graphics();
    crest.lineStyle(2, 0x67e8f9, 0.9);
    crest.strokeCircle(195, 32, 18);
    crest.fillStyle(COLOR.accent, 1);
    crest.fillTriangle(195, 17, 205, 37, 185, 37);
    crest.fillStyle(0xfbbf24, 1);
    crest.fillTriangle(195, 42, 200, 33, 190, 33);
    this.text(195, 66, 'DUNGEON ASCENT', 26, COLOR.white, true, true);
    this.text(195, 97, 'ROGUELIKE  /  ACTION  /  SURVIVE', 10, COLOR.secondary, true);

    const profile = progressStore.current;
    this.plate(195, 148, 354, 66, 0x14243a, 0x39506b, 13);
    this.add.circle(52, 148, 17, HEROES[profile.selectedHero].color);
    this.text(81, 136, 'ACTIEVE HELD', 9, COLOR.faint);
    this.text(81, 151, HEROES[profile.selectedHero].name.toUpperCase(), 15, COLOR.white, false, true);
    this.add.rectangle(234, 148, 1, 36, 0x415772, 0.85);
    this.text(260, 135, 'GOUD', 10, COLOR.faint);
    this.text(260, 151, profile.gold.toLocaleString('nl-BE') + '  G', 17, '#fde68a', false, true);
    this.text(23, 189, 'KIES JE LOADOUT', 10, COLOR.faint);
    this.text(367, 189, 'BESTE KAMER ' + profile.highestRoom + '/20', 10, COLOR.secondary, true);
  }

  private drawNavigation(): void {
    const tabs: Array<[MenuTab, string]> = [
      ['heroes', 'HELDEN'], ['weapons', 'WAPENS'], ['upgrades', 'UPGRADES'], ['settings', 'OPTIES'],
    ];
    tabs.forEach(([tab, label], i) => {
      const x = 59 + i * 91;
      this.button(x, 221, 84, 38, label, () => this.chooseTab(tab),
        this.tab === tab ? 'selected' : 'quiet', false, 10);
    });
  }

  private chooseTab(tab: MenuTab): void {
    this.tab = tab;
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

  private drawHeroes(): void {
    this.section('KIES JE HELD', 'Elke held heeft een unieke speelstijl');
    const profile = progressStore.current;
    HERO_IDS.forEach((id, index) => {
      const hero = HEROES[id];
      const y = 337 + index * 130;
      const unlocked = profile.unlockedHeroes.includes(id);
      const selected = profile.selectedHero === id;
      this.plate(195, y, 330, 120,
        selected ? 0x173447 : COLOR.card, selected ? COLOR.accent : COLOR.border, 12);
      this.add.circle(56, y - 33, 18, hero.color).setStrokeStyle(2, 0xcbd5e1);
      this.text(85, y - 47, hero.name.toUpperCase(), 16, COLOR.white, false, true);
      this.text(85, y - 24, 'LEVEL ' + profile.heroLevels[id], 10, '#93c5fd');
      this.text(46, y - 2, hero.description, 11, COLOR.secondary);
      this.text(46, y + 20, hero.passive, 11, '#fcd34d');
      const stats = getHeroStats(id, profile.heroLevels[id]);
      this.text(46, y + 42, 'HP ' + stats.maxHp + '   DMG ' + stats.damage + '   DEF ' + stats.defense,
        10, COLOR.secondary);
      const label = selected ? 'ACTIEF' : unlocked ? 'KIEZEN' : hero.unlockCost + ' G';
      this.button(311, y + 39, 87, 33, label, () => this.runAction(
        unlocked ? { type: 'selectHero', id } : { type: 'unlockHero', id },
      ), selected ? 'selected' : 'normal', selected || (!unlocked && profile.gold < hero.unlockCost), 10);
    });
  }

  private drawWeapons(): void {
    this.section('BEWAPENING', 'Ontgrendel en selecteer je favoriete wapen');
    const profile = progressStore.current;
    WEAPON_IDS.forEach((id, index) => {
      const weapon = WEAPONS[id];
      const y = 313 + index * 76;
      const unlocked = profile.unlockedWeapons.includes(id);
      const selected = profile.selectedWeapon === id;
      this.plate(195, y, 330, 70, selected ? 0x173447 : COLOR.card,
        selected ? COLOR.accent : COLOR.border, 10);
      this.text(43, y - 24, weapon.name.toUpperCase(), 13, COLOR.white, false, true);
      this.text(43, y - 5, weapon.description, 10, COLOR.secondary);
      const stats = getWeaponStats(id, profile.weaponLevels[id]);
      this.text(43, y + 16, 'LV.' + profile.weaponLevels[id] + '  ·  ' +
        stats.damage + ' DMG  ·  ' + stats.fireRate + '/S', 10, '#fcd34d');
      const label = selected ? 'ACTIEF' : unlocked ? 'KIEZEN' : weapon.unlockCost + ' G';
      this.button(311, y + 20, 87, 29, label, () => this.runAction(
        unlocked ? { type: 'selectWeapon', id } : { type: 'unlockWeapon', id },
      ), selected ? 'selected' : 'normal',
      selected || (!unlocked && profile.gold < weapon.unlockCost), 10);
    });
  }

  private drawUpgrades(): void {
    this.button(112, 276, 158, 34, 'PERMANENT', () => this.setUpgradeCategory('permanent'),
      this.upgradeCategory === 'permanent' ? 'selected' : 'quiet', false, 11);
    this.button(279, 276, 158, 34, 'HELD & WAPEN', () => this.setUpgradeCategory('equipment'),
      this.upgradeCategory === 'equipment' ? 'selected' : 'quiet', false, 11);

    const profile = progressStore.current;
    const rows: Array<{ label: string; description: string; level: number; unlocked: boolean;
      max: number; cost: number; action: ProfileAction }> = this.upgradeCategory === 'permanent'
      ? PERMANENT_UPGRADE_IDS.map(id => ({
          label: PERMANENT_UPGRADES[id].name, description: PERMANENT_UPGRADES[id].description,
          level: profile.permanentLevels[id], unlocked: true, max: MAX_PERMANENT_LEVEL,
          cost: permanentUpgradeCost(id, profile.permanentLevels[id]),
          action: { type: 'upgradePermanent', id } as const,
        }))
      : [
          ...HERO_IDS.map(id => ({
            label: HEROES[id].name, description: 'Held verbeteren', level: profile.heroLevels[id],
            unlocked: profile.unlockedHeroes.includes(id), max: MAX_HERO_LEVEL,
            cost: heroUpgradeCost(profile.heroLevels[id]),
            action: { type: 'upgradeHero', id } as const,
          })),
          ...WEAPON_IDS.map(id => ({
            label: WEAPONS[id].name, description: 'Wapen verbeteren', level: profile.weaponLevels[id],
            unlocked: profile.unlockedWeapons.includes(id), max: MAX_WEAPON_LEVEL,
            cost: weaponUpgradeCost(profile.weaponLevels[id]),
            action: { type: 'upgradeWeapon', id } as const,
          })),
        ];

    const compact = this.upgradeCategory === 'equipment';
    rows.forEach((row, index) => {
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
  }

  private setUpgradeCategory(category: 'equipment' | 'permanent'): void {
    this.upgradeCategory = category;
    this.scene.restart();
  }

  private drawSettings(): void {
    const profile = progressStore.current;
    this.section('INSTELLINGEN', 'Beheer je voortgang en voorkeuren');
    this.plate(195, 348, 328, 76, COLOR.card, COLOR.border, 11);
    this.text(46, 322, 'AVONTURENPROFIEL', 10, COLOR.faint);
    this.text(46, 344, 'Hoogste kamer bereikt', 12, COLOR.secondary);
    this.text(337, 344, profile.highestRoom + ' / 20', 16, '#7dd3fc', true, true);
    this.text(46, 365, 'Voortgang wordt lokaal opgeslagen', 10, COLOR.faint);

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
    if (this.awaitingKey) event.preventDefault();
  };

  private readonly captureMouseButton = (event: PointerEvent): void => {
    if (!this.awaitingKey || event.pointerType !== 'mouse' ||
      !(event.target instanceof Node) || !this.game.canvas.contains(event.target)) return;
    const key = mouseButtonKey(event.button);
    if (!key) return;
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

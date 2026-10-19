import Phaser from 'phaser';
import { GAME_SCENE_KEY, MENU_SCENE_KEY } from '../config/constants';
import {
  HERO_IDS, HEROES, getHeroStats, heroUpgradeCost, MAX_HERO_LEVEL,
} from '../heroes/heroConfig';
import { progressStore, type ProfileAction } from '../progression/ProgressStore';
import { MAX_PERMANENT_LEVEL, PERMANENT_UPGRADE_IDS, PERMANENT_UPGRADES,
  permanentUpgradeCost } from '../progression/economy';
import {
  WEAPON_IDS, WEAPONS, getWeaponStats, weaponUpgradeCost, MAX_WEAPON_LEVEL,
} from '../weapons/weaponConfig';

type MenuTab = 'heroes' | 'weapons' | 'upgrades' | 'settings';
const FONT = 'system-ui, sans-serif';

export class MainMenuScene extends Phaser.Scene {
  private tab: MenuTab = 'heroes';
  private upgradeCategory: 'equipment' | 'permanent' = 'permanent';
  private resetRequested = false;
  public constructor() { super(MENU_SCENE_KEY); }

  public create(): void {
    this.cameras.main.setBackgroundColor('#07111f');
    this.add.rectangle(195, 422, 390, 844, 0x081525);
    this.add.text(195, 35, 'DUNGEON ASCENT', {
      fontFamily: FONT, fontSize: '29px', fontStyle: 'bold', color: '#e2e8f0',
    }).setOrigin(0.5);
    const profile = progressStore.current;
    this.add.text(195, 78, 'Kies je held en uitrusting', {
      fontFamily: FONT, fontSize: '13px', color: '#94a3b8',
    }).setOrigin(0.5);
    this.add.text(25, 107, 'HERO: ' + HEROES[profile.selectedHero].name, {
      fontFamily: FONT, fontSize: '12px', color: '#7dd3fc',
    });
    this.add.text(365, 107, 'GOUD ' + profile.gold, {
      fontFamily: FONT, fontSize: '12px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.add.text(25, 127, 'WAPEN: ' + WEAPONS[profile.selectedWeapon].name, {
      fontFamily: FONT, fontSize: '12px', color: '#c4b5fd',
    });
    this.button(53, 176, 84, 42, 'HEROES', () => this.chooseTab('heroes'), this.tab === 'heroes');
    this.button(148, 176, 84, 42, 'WEAPONS', () => this.chooseTab('weapons'), this.tab === 'weapons');
    this.button(243, 176, 84, 42, 'UPGRADES', () => this.chooseTab('upgrades'), this.tab === 'upgrades');
    this.button(338, 176, 84, 42, 'SETTINGS', () => this.chooseTab('settings'), this.tab === 'settings');

    if (this.tab === 'heroes') this.drawHeroes();
    else if (this.tab === 'weapons') this.drawWeapons();
    else if (this.tab === 'upgrades') this.drawUpgrades();
    else this.drawSettings();

    this.button(195, 758, 300, 62, '▶  PLAY', () => this.scene.start(GAME_SCENE_KEY), true);
    this.add.text(195, 808, 'Fase 8 · Goud & run-upgrades', {
      fontFamily: FONT, fontSize: '11px', color: '#64748b',
    }).setOrigin(0.5);
  }

  private chooseTab(tab: MenuTab): void {
    this.tab = tab;
    this.resetRequested = false;
    this.scene.restart();
  }

  private runAction(action: ProfileAction): void {
    progressStore.dispatch(action);
    this.scene.restart();
  }

  private drawHeroes(): void {
    const profile = progressStore.current;
    HERO_IDS.forEach((id, index) => {
      const hero = HEROES[id];
      const y = 260 + index * 142;
      const unlocked = profile.unlockedHeroes.includes(id);
      const selected = profile.selectedHero === id;
      this.add.rectangle(195, y, 352, 127, selected ? 0x183f54 : 0x172338)
        .setStrokeStyle(2, selected ? 0x38bdf8 : 0x334155);
      this.add.circle(56, y - 28, 20, hero.color).setStrokeStyle(3, 0xf8fafc);
      this.add.text(87, y - 50, hero.name.toUpperCase() + ' · LV.' + profile.heroLevels[id], {
        fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#f8fafc',
      });
      this.add.text(88, y - 25, hero.description, {
        fontFamily: FONT, fontSize: '11px', color: '#cbd5e1',
      });
      this.add.text(35, y + 1, hero.passive, {
        fontFamily: FONT, fontSize: '12px', color: '#fbbf24',
      });
      const stats = getHeroStats(id, profile.heroLevels[id]);
      this.add.text(35, y + 25, 'HP ' + stats.maxHp + '   DMG ' + stats.damage + '   DEF ' + stats.defense, {
        fontFamily: FONT, fontSize: '11px', color: '#94a3b8',
      });
      const label = selected ? 'GEKOZEN' : unlocked ? 'KIES' : hero.unlockCost + ' G';
      this.button(307, y + 34, 103, 39, label, () => this.runAction(
        unlocked ? { type: 'selectHero', id } : { type: 'unlockHero', id },
      ), selected);
    });
  }

  private drawWeapons(): void {
    const profile = progressStore.current;
    WEAPON_IDS.forEach((id, index) => {
      const weapon = WEAPONS[id];
      const y = 245 + index * 93;
      const unlocked = profile.unlockedWeapons.includes(id);
      const selected = profile.selectedWeapon === id;
      this.add.rectangle(195, y, 352, 84, selected ? 0x183f54 : 0x172338)
        .setStrokeStyle(2, selected ? 0x38bdf8 : 0x334155);
      this.add.text(33, y - 33, weapon.name + ' · LV.' + profile.weaponLevels[id], {
        fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#f8fafc',
      });
      this.add.text(33, y - 9, weapon.description, {
        fontFamily: FONT, fontSize: '11px', color: '#cbd5e1',
      });
      const stats = getWeaponStats(id, profile.weaponLevels[id]);
      this.add.text(33, y + 12, 'DMG ' + stats.damage + '  ·  ' + stats.fireRate + '/s', {
        fontFamily: FONT, fontSize: '11px', color: '#fbbf24',
      });
      const label = selected ? 'GEKOZEN' : unlocked ? 'KIES' : weapon.unlockCost + ' G';
      this.button(315, y + 16, 95, 35, label, () => this.runAction(
        unlocked ? { type: 'selectWeapon', id } : { type: 'unlockWeapon', id },
      ), selected);
    });
  }

  private drawUpgrades(): void {
    const profile = progressStore.current;
    this.button(107, 221, 165, 35, 'PERMANENT', () => this.setUpgradeCategory('permanent'),
      this.upgradeCategory === 'permanent');
    this.button(283, 221, 165, 35, 'HELD / WAPEN', () => this.setUpgradeCategory('equipment'),
      this.upgradeCategory === 'equipment');

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
            label: HEROES[id].name, description: 'Hero bonus', level: profile.heroLevels[id],
            unlocked: profile.unlockedHeroes.includes(id),
            max: MAX_HERO_LEVEL, cost: heroUpgradeCost(profile.heroLevels[id]),
            action: { type: 'upgradeHero', id } as const,
          })),
          ...WEAPON_IDS.map(id => ({
            label: WEAPONS[id].name, description: 'Wapen bonus', level: profile.weaponLevels[id],
            unlocked: profile.unlockedWeapons.includes(id),
            max: MAX_WEAPON_LEVEL, cost: weaponUpgradeCost(profile.weaponLevels[id]),
            action: { type: 'upgradeWeapon', id } as const,
          })),
        ];
    const rowHeight = this.upgradeCategory === 'equipment' ? 53 : 83;
    rows.forEach((row, index) => {
      const y = 276 + index * rowHeight;
      this.add.rectangle(195, y, 352, rowHeight - 5, 0x172338).setStrokeStyle(1, 0x334155);
      this.add.text(32, y - rowHeight / 2 + 7, row.label, {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#f8fafc',
      });
      if (this.upgradeCategory === 'permanent') {
        this.add.text(32, y - 6, row.description, {
          fontFamily: FONT, fontSize: '12px', color: '#94a3b8',
        });
      }
      this.add.text(32, y + rowHeight / 2 - 19, 'Level ' + row.level + '/' + row.max, {
        fontFamily: FONT, fontSize: '11px', color: '#94a3b8',
      });
      const label = !row.unlocked ? 'GESLOTEN' : row.level >= row.max ? 'MAX' : row.cost + ' G';
      this.button(311, y, 104, 38, label, () => this.runAction(row.action),
        false, !row.unlocked || row.level >= row.max || profile.gold < row.cost);
    });
  }

  private setUpgradeCategory(category: 'equipment' | 'permanent'): void {
    this.upgradeCategory = category;
    this.scene.restart();
  }

  private drawSettings(): void {
    const profile = progressStore.current;
    this.add.text(195, 243, 'VOORTGANG & INSTELLINGEN', {
      fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#f8fafc',
    }).setOrigin(0.5);
    this.add.text(40, 302, 'Hoogste kamer: ' + profile.highestRoom + '/20', {
      fontFamily: FONT, fontSize: '15px', color: '#7dd3fc',
    });
    this.button(195, 377, 310, 48,
      'MUZIEK: ' + (profile.settings.musicEnabled ? 'AAN' : 'UIT'),
      () => this.runAction({ type: 'setSetting', key: 'musicEnabled',
        value: !profile.settings.musicEnabled }));
    this.button(195, 442, 310, 48,
      'GELUID: ' + (profile.settings.sfxEnabled ? 'AAN' : 'UIT'),
      () => this.runAction({ type: 'setSetting', key: 'sfxEnabled',
        value: !profile.settings.sfxEnabled }));
    this.add.text(195, 509, 'Audio zelf volgt in fase 9.', {
      fontFamily: FONT, fontSize: '12px', color: '#94a3b8',
    }).setOrigin(0.5);
    if (!this.resetRequested) {
      this.button(195, 588, 310, 46, 'RESET VOORTGANG', () => {
        this.resetRequested = true;
        this.scene.restart();
      });
    } else {
      this.add.text(195, 548, 'Alles wissen? Dit kan niet ongedaan worden.', {
        fontFamily: FONT, fontSize: '12px', color: '#fca5a5',
      }).setOrigin(0.5);
      this.button(116, 602, 145, 47, 'JA, WISSEN', () => {
        progressStore.reset();
        this.resetRequested = false;
        this.scene.restart();
      });
      this.button(274, 602, 145, 47, 'ANNULEREN', () => {
        this.resetRequested = false;
        this.scene.restart();
      }, true);
    }
  }

  private button(x: number, y: number, width: number, height: number, label: string,
    action: () => void, emphasized = false, disabled = false): void {
    const rect = this.add.rectangle(
      x, y, width, height, disabled ? 0x273244 : emphasized ? 0x0e7490 : 0x334155,
    ).setStrokeStyle(2, disabled ? 0x3f4d60 : emphasized ? 0x67e8f9 : 0x64748b);
    this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: height > 50 ? '22px' : '12px',
      fontStyle: 'bold', color: disabled ? '#64748b' : '#f8fafc',
    }).setOrigin(0.5);
    if (!disabled) rect.setInteractive({ useHandCursor: true })
      .on('pointerdown', action);
  }
}

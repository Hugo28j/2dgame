import Phaser from 'phaser';
import { GAME_OVER_SCENE_KEY, GAME_SCENE_KEY, GAME_WIDTH, MENU_SCENE_KEY } from '../config/constants';
import type { RunReport } from '../progression/RunLedger';
import { progressStore } from '../progression/ProgressStore';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { getWorld } from '../worlds/worldConfig';

interface GameOverData {
  report: RunReport;
  chosenUpgrades: { name: string; stacks: number }[];
}
export class GameOverScene extends Phaser.Scene {
  private dataForRun?: GameOverData;
  public constructor() { super(GAME_OVER_SCENE_KEY); }
  public init(data: GameOverData): void { this.dataForRun = data; }

  public create(): void {
    const data = this.dataForRun;
    if (!data) {
      this.scene.start(MENU_SCENE_KEY);
      return;
    }
    // First show the menu immediately; dispose of the sleeping combat scene
    // only after the first Game Over frame can render. This prevents a heavy
    // 30-enemy teardown from blocking the death screen.
    this.time.delayedCall(180, () => {
      if (this.scene.isSleeping(GAME_SCENE_KEY)) this.scene.stop(GAME_SCENE_KEY);
    });
    const { report } = data;
    const profile = progressStore.current;
    const world = getWorld(report.worldId);
    const fontFamily = 'system-ui, sans-serif';
    this.cameras.main.setScroll((390 - GAME_WIDTH) / 2, 0);
    this.cameras.main.setBackgroundColor('#081525');
    this.add.rectangle(195, 422, 364, 760, 0x101d30)
      .setStrokeStyle(3, report.victory ? 0x38bdf8 : 0xef4444);
    this.add.text(195, 87, report.victory ? 'CHAPTER VOLTOOID!' : 'GAME OVER', {
      fontFamily, fontSize: '28px', fontStyle: 'bold',
      color: report.victory ? '#67e8f9' : '#fca5a5',
    }).setOrigin(0.5);
    this.add.text(195, 128, 'JE RUN-RESULTAAT', {
      fontFamily, fontSize: '14px', color: '#cbd5e1',
    }).setOrigin(0.5);

    const rows = [
      ['Wereld', world.id + '/5 · ' + world.name],
      ['Bereikte kamer', String(report.reachedRoom) + '/' + CHAPTER_ROOM_COUNT],
      ['Kamers voltooid', String(report.roomsCleared)],
      ['Vijanden verslagen', String(report.enemiesDefeated)],
      ['Bosses verslagen', String(report.bossesDefeated) + '/7'],
      ['Totale schade', String(report.totalDamage)],
      ['VERDIEND DEZE RUN', '+' + report.earnedGold + ' G'],
      ['TOTAAL OOIT VERDIEND', profile.totalGoldEarned.toLocaleString('nl-BE') + ' G'],
      ['Huidig goudsaldo', profile.gold.toLocaleString('nl-BE') + ' G'],
      ['Wereldrecord', 'Kamer ' + profile.worldBestRooms[world.id - 1]],
    ];
    rows.forEach(([label, value], index) => {
      const y = 162 + index * 33;
      this.add.text(43, y, label ?? '', {
        fontFamily, fontSize: index === 6 || index === 7 ? '12px' : '13px',
        fontStyle: index === 6 || index === 7 ? 'bold' : 'normal',
        color: index === 6 || index === 7 ? '#fde68a' : '#94a3b8',
      });
      this.add.text(349, y, value ?? '', {
        fontFamily, fontSize: '13px', fontStyle: 'bold',
        color: index === 6 || index === 7 ? '#fde68a' : '#f8fafc',
      }).setOrigin(1, 0);
    });

    if (report.victory && world.id < 5) {
      this.add.text(195, 629, '✦  WERELD ' + (world.id + 1) + ' ONTGRENDELD!  ✦', {
        fontFamily, fontSize: '15px', fontStyle: 'bold', color: '#86efac',
      }).setOrigin(0.5);
    }
    const upgrades = data.chosenUpgrades;
    this.add.text(43, 503, 'TIJDELIJKE UPGRADES', {
      fontFamily, fontSize: '13px', fontStyle: 'bold', color: '#7dd3fc',
    });
    this.add.text(43, 526,
      upgrades.length ? upgrades.map(u => u.name + (u.stacks > 1 ? ' ×' + u.stacks : '')).join(', ') : 'Geen',
      { fontFamily, fontSize: '12px', color: '#cbd5e1', wordWrap: { width: 310 } },
    );

    const button = (y: number, label: string, callback: () => void, primary = false): void => {
      const plate = this.add.rectangle(195, y, 294, 53, primary ? 0x0e7490 : 0x334155)
        .setStrokeStyle(2, primary ? 0x67e8f9 : 0x64748b)
        .setInteractive({ useHandCursor: true });
      this.add.text(195, y, label, { fontFamily, fontSize: '17px', fontStyle: 'bold', color: '#fff' })
        .setOrigin(0.5);
      plate.on('pointerdown', callback);
    };
    const navigate = (target: string): void => {
      // Also safe when the user clicks before deferred cleanup fires.
      if (this.scene.isSleeping(GAME_SCENE_KEY)) this.scene.stop(GAME_SCENE_KEY);
      this.scene.start(target);
    };
    button(686, 'OPNIEUW SPELEN', () => navigate(GAME_SCENE_KEY), true);
    button(755, 'HOOFDMENU', () => navigate(MENU_SCENE_KEY));
    this.add.text(195, 811, 'Alleen opgeraapt goud telt mee — eenmaal opgeslagen', {
      fontFamily, fontSize: '10px', color: '#94a3b8',
    }).setOrigin(0.5);
  }
}

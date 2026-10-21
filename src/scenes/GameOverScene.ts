import Phaser from 'phaser';
import {
  GAME_HEIGHT, GAME_OVER_SCENE_KEY, GAME_SCENE_KEY, GAME_WIDTH, MENU_SCENE_KEY,
} from '../config/constants';
import type { RunReport } from '../progression/RunLedger';
import { progressStore } from '../progression/ProgressStore';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { getWorld } from '../worlds/worldConfig';
import {
  clientPointInGame, containsScreenPoint, endScreenLayout, sceneKeyForEndScreenAction,
} from '../ui/endScreenLayout';

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
    const layout = endScreenLayout(GAME_WIDTH);
    const centerX = layout.centerX;
    this.input.enabled = true;
    this.input.setTopOnly(true);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor('#17324b');
    this.add.rectangle(centerX, 422, GAME_WIDTH, GAME_HEIGHT, 0x17324b)
      .setScrollFactor(0);
    this.add.circle(centerX + 130, 95, 220, report.victory ? 0x0e7490 : 0x9f3040, 0.16)
      .setScrollFactor(0);
    this.add.circle(centerX - 145, 760, 190, 0x25668a, 0.13).setScrollFactor(0);
    const panel = this.add.rectangle(centerX, 422, 364, 760, 0x23415f)
      .setStrokeStyle(3, report.victory ? 0x67e8f9 : 0xfb7185);
    panel.setScale(0.92).setAlpha(0.72);
    this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, alpha: 0.98,
      duration: 380, ease: 'Back.easeOut' });
    const headline = this.add.text(centerX, 87, report.victory ? 'CHAPTER VOLTOOID!' : 'GAME OVER', {
      fontFamily, fontSize: '28px', fontStyle: 'bold',
      color: report.victory ? '#a5f3fc' : '#fecdd3',
    }).setOrigin(0.5).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: headline, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 600, delay: 120, ease: 'Back.easeOut' });
    this.add.text(centerX, 128, 'JE RUN-RESULTAAT', {
      fontFamily, fontSize: '14px', color: '#e2e8f0',
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
      this.add.text(layout.panelLeft, y, label ?? '', {
        fontFamily, fontSize: index === 6 || index === 7 ? '12px' : '13px',
        fontStyle: index === 6 || index === 7 ? 'bold' : 'normal',
        color: index === 6 || index === 7 ? '#fef08a' : '#cbd5e1',
      });
      this.add.text(layout.panelRight, y, value ?? '', {
        fontFamily, fontSize: '13px', fontStyle: 'bold',
        color: index === 6 || index === 7 ? '#fef08a' : '#ffffff',
      }).setOrigin(1, 0);
    });

    if (report.victory && world.id < 5) {
      this.add.text(centerX, 629, '✦  WERELD ' + (world.id + 1) + ' ONTGRENDELD!  ✦', {
        fontFamily, fontSize: '15px', fontStyle: 'bold', color: '#86efac',
      }).setOrigin(0.5);
    }
    this.add.text(centerX, 566, 'ARMOR: VERSLA VIJANDEN EN RAAP LOOT OP', {
      fontFamily, fontSize: '10px', color: '#cbd5e1',
    }).setOrigin(0.5);
    const upgrades = data.chosenUpgrades;
    this.add.text(layout.panelLeft, 503, 'TIJDELIJKE UPGRADES', {
      fontFamily, fontSize: '13px', fontStyle: 'bold', color: '#7dd3fc',
    });
    this.add.text(layout.panelLeft, 526,
      upgrades.length ? upgrades.map(u => u.name + (u.stacks > 1 ? ' ×' + u.stacks : '')).join(', ') : 'Geen',
      { fontFamily, fontSize: '12px', color: '#e2e8f0', wordWrap: { width: 310 } },
    );

    // One hit surface per button, in world/screen canvas coordinates.
    // A graphics object positioned at zero can have a misaligned interactive
    // hit area in Phaser; use an explicit Zone for input instead.
    let navigating = false;
    const navigate = (target: string): void => {
      if (navigating) return;
      navigating = true;
      // The old run is sleeping under this scene. Stop it before creating
      // the new game or menu, otherwise stale input/cameras can survive.
      if (this.scene.isSleeping(GAME_SCENE_KEY) || this.scene.isActive(GAME_SCENE_KEY)) {
        this.scene.stop(GAME_SCENE_KEY);
      }
      this.scene.start(target);
    };
    const button = (bounds: typeof layout.replay, label: string,
      target: string, primary = false): void => {
      const plate = this.add.graphics().setDepth(30).setScrollFactor(0);
      const drawPlate = (pressed: boolean): void => {
        plate.clear();
        plate.fillStyle(primary ? (pressed ? 0x0891b2 : 0x0e7490) :
          (pressed ? 0x475569 : 0x334155), 1);
        plate.fillRoundedRect(bounds.x - bounds.width / 2,
          bounds.y - bounds.height / 2, bounds.width, bounds.height, 8);
        plate.lineStyle(3, primary ? 0x67e8f9 : 0x94a3b8, 1);
        plate.strokeRoundedRect(bounds.x - bounds.width / 2,
          bounds.y - bounds.height / 2, bounds.width, bounds.height, 8);
      };
      drawPlate(false);
      this.add.text(bounds.x, bounds.y, label, {
        fontFamily, fontSize: '17px', fontStyle: 'bold', color: '#fff',
      }).setOrigin(0.5).setDepth(31).setScrollFactor(0);
      const hitZone = this.add.zone(bounds.x, bounds.y, bounds.width, bounds.height)
        .setDepth(100).setScrollFactor(0).setInteractive({ useHandCursor: true });
      hitZone.on('pointerover', () => drawPlate(true));
      hitZone.on('pointerout', () => drawPlate(false));
      // Both mouse and touch fire pointerdown without requiring pointerup.
      hitZone.on('pointerdown', () => navigate(target));
    };
    button(layout.replay, 'OPNIEUW SPELEN',
      sceneKeyForEndScreenAction('replay'), true);
    button(layout.menu, 'HOOFDMENU', sceneKeyForEndScreenAction('menu'));

    // Browser-level fallback: touches/clicks outside Phaser's pointer dispatch
    // still work (e.g. certain mobile browsers after scene sleep). Map client
    // coordinates to the actual scaled canvas rect, not viewport coordinates.
    const fallback = (event: PointerEvent): void => {
      if (navigating || !this.scene.isActive()) return;
      const rect = this.game.canvas.getBoundingClientRect();
      const pt = clientPointInGame(event.clientX, event.clientY, rect,
        GAME_WIDTH, GAME_HEIGHT);
      if (!pt) return;
      if (containsScreenPoint(layout.replay, pt.x, pt.y)) {
        navigate(sceneKeyForEndScreenAction('replay'));
      } else if (containsScreenPoint(layout.menu, pt.x, pt.y)) {
        navigate(sceneKeyForEndScreenAction('menu'));
      }
    };
    window.addEventListener('pointerdown', fallback, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pointerdown', fallback, true);
    });
    this.add.text(centerX, 811, 'Alleen opgeraapt goud telt mee — eenmaal opgeslagen', {
      fontFamily, fontSize: '10px', color: '#cbd5e1',
    }).setOrigin(0.5);
  }
}

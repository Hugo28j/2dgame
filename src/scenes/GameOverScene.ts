import Phaser from 'phaser';
import {
  GAME_HEIGHT, GAME_OVER_SCENE_KEY, GAME_SCENE_KEY, GAME_WIDTH, MENU_SCENE_KEY,
} from '../config/constants';
import type { RunReport } from '../progression/RunLedger';
import { progressStore } from '../progression/ProgressStore';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { getWorld } from '../worlds/worldConfig';
import {
  clientBoundsForGameButton, endScreenLayout,
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

    const button = (bounds: typeof layout.replay, label: string,
      callback: () => void, primary = false): void => {
      // The visible graphic itself owns the exact same rectangle used for input.
      const plate = this.add.graphics()
        .setPosition(bounds.x - bounds.width / 2, bounds.y - bounds.height / 2)
        .setDepth(30).setScrollFactor(0);
      const drawPlate = (pressed: boolean): void => {
        plate.clear();
        plate.fillStyle(primary ? (pressed ? 0x0891b2 : 0x0e7490) :
          (pressed ? 0x475569 : 0x334155), 1);
        plate.fillRoundedRect(0, 0, bounds.width, bounds.height, 8);
        plate.lineStyle(3, primary ? 0x67e8f9 : 0x94a3b8, 1);
        plate.strokeRoundedRect(0, 0, bounds.width, bounds.height, 8);
      };
      drawPlate(false);
      const caption = this.add.text(bounds.x, bounds.y, label, {
        fontFamily, fontSize: '17px', fontStyle: 'bold', color: '#fff',
      }).setOrigin(0.5).setDepth(31).setScrollFactor(0);
      let activated = false;
      const activate = (): void => {
        if (activated) return;
        activated = true;
        callback();
      };
      plate.setInteractive(new Phaser.Geom.Rectangle(0, 0, bounds.width, bounds.height),
        Phaser.Geom.Rectangle.Contains);
      plate.input!.cursor = 'pointer';
      plate.on('pointerover', () => drawPlate(true));
      plate.on('pointerout', () => drawPlate(false));
      plate.on('pointerdown', activate);
      this.tweens.add({ targets: [plate, caption], alpha: { from: 0, to: 1 },
        duration: 260, delay: 180, ease: 'Sine.easeOut' });
    };
    let navigating = false;
    const navigate = (target: string): void => {
      if (navigating) return;
      navigating = true;
      // Use the global scene manager so this works even while the Game Over
      // scene is being shut down. Starting GameScene constructs a fresh run in
      // room 1 while ProgressStore keeps the selected hero and world intact.
      const sceneManager = this.game.scene;
      sceneManager.stop(GAME_SCENE_KEY);
      sceneManager.stop(GAME_OVER_SCENE_KEY);
      sceneManager.start(target);
    };
    button(layout.replay, 'OPNIEUW SPELEN', () => navigate(GAME_SCENE_KEY), true);
    button(layout.menu, 'HOOFDMENU', () => navigate(MENU_SCENE_KEY));

    // Native HTML controls sit over the canvas buttons. They are intentionally
    // transparent: Phaser keeps drawing the visuals, while the browser handles
    // mouse, touch, keyboard activation and accessibility consistently.
    const domButtons: Array<{
      element: HTMLButtonElement;
      bounds: typeof layout.replay;
    }> = [];
    const addDomButton = (bounds: typeof layout.replay, label: string,
      callback: () => void): void => {
      const element = document.createElement('button');
      element.type = 'button';
      element.setAttribute('aria-label', label);
      element.title = label;
      Object.assign(element.style, {
        position: 'fixed',
        zIndex: '1000',
        margin: '0',
        padding: '0',
        border: '0',
        background: 'transparent',
        color: 'transparent',
        cursor: 'pointer',
        touchAction: 'manipulation',
      });
      element.addEventListener('click', callback);
      document.body.appendChild(element);
      domButtons.push({ element, bounds });
    };
    const syncDomButtons = (): void => {
      const canvasBounds = this.game.canvas.getBoundingClientRect();
      for (const domButton of domButtons) {
        const bounds = clientBoundsForGameButton(domButton.bounds, canvasBounds,
          GAME_WIDTH, GAME_HEIGHT);
        if (!bounds) continue;
        domButton.element.style.left = `${bounds.left}px`;
        domButton.element.style.top = `${bounds.top}px`;
        domButton.element.style.width = `${bounds.width}px`;
        domButton.element.style.height = `${bounds.height}px`;
      }
    };
    addDomButton(layout.replay, 'Opnieuw spelen', () => navigate(GAME_SCENE_KEY));
    addDomButton(layout.menu, 'Hoofdmenu', () => navigate(MENU_SCENE_KEY));
    syncDomButtons();
    window.addEventListener('resize', syncDomButtons);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('resize', syncDomButtons);
      for (const domButton of domButtons) domButton.element.remove();
    });
    this.add.text(centerX, 811, 'Alleen opgeraapt goud telt mee — eenmaal opgeslagen', {
      fontFamily, fontSize: '10px', color: '#cbd5e1',
    }).setOrigin(0.5);
  }
}

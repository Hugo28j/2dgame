import Phaser from 'phaser';
import {
  GAME_HEIGHT, GAME_OVER_SCENE_KEY, GAME_WIDTH, MENU_SCENE_KEY,
} from '../config/constants';
import type { RunReport } from '../progression/RunLedger';
import { progressStore } from '../progression/ProgressStore';
import type { ArmorItem } from '../progression/armor';
import { armorRunRewards } from '../ui/armorRunRewards';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { getWorld } from '../worlds/worldConfig';
import { homeButtonLayout, homeButtonClientBounds } from '../ui/homeButtonLayout';

interface GameOverData {
  report: RunReport;
  chosenUpgrades: { name: string; stacks: number }[];
  collectedArmor: ArmorItem[];
}

/**
 * A fresh, self-contained end screen shared by death and victory.
 * The single HOME control is a REAL HTML button, not a Phaser graphics hitbox
 * or a transparent overlay. It stays aligned to the scaled canvas on phones
 * and desktops and reloads to BootScene -> MainMenuScene reliably.
 */
export class GameOverScene extends Phaser.Scene {
  private dataForRun?: GameOverData;

  public constructor() {
    super(GAME_OVER_SCENE_KEY);
  }

  public init(data: GameOverData): void {
    this.dataForRun = data;
  }

  public create(): void {
    if (!this.dataForRun) {
      this.scene.start(MENU_SCENE_KEY);
      return;
    }

    const { report } = this.dataForRun;
    const world = getWorld(report.worldId);
    const profile = progressStore.current;
    const rewards = armorRunRewards(this.dataForRun.collectedArmor ?? []);
    const win = report.victory;
    const accent = win ? 0x5de2c0 : 0xff8190;
    const accentHex = win ? '#75f6d5' : '#ff9aaa';
    const panelWidth = Math.min(GAME_WIDTH - 34, 446);
    const cx = GAME_WIDTH / 2;
    const font = 'system-ui, sans-serif';

    // Opaque backdrop hides the sleeping gameplay without a costly combat
    // teardown during the death frame. The full reload handles teardown.
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor('#102338');
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x102338);
    this.add.circle(cx - panelWidth / 2, 135, 160, 0x31b9e0, 0.10);
    this.add.circle(cx + panelWidth / 2, 690, 200, accent, 0.08);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x9cd6e9, 0.075);
    for (let x = 0; x <= GAME_WIDTH; x += 38) grid.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 38) grid.lineBetween(0, y, GAME_WIDTH, y);

    this.add.rectangle(cx, 421, panelWidth, 704, 0x1b344a, 0.98)
      .setStrokeStyle(2, 0x47708a, 0.95);
    this.add.rectangle(cx, 86, panelWidth - 38, 4, accent, 0.95);

    this.add.text(cx, 113, 'DUNGEON ASCENT', {
      fontFamily: font, fontSize: '14px', fontStyle: 'bold',
      color: '#c9e9fa', letterSpacing: 2,
    }).setOrigin(0.5);

    const emblem = this.add.circle(cx, 168, 38, win ? 0x235e64 : 0x613c55)
      .setStrokeStyle(3, accent);
    this.add.circle(cx, 168, 29, win ? 0x2e807b : 0x844a64, 0.65);
    this.add.text(cx, 166, win ? '★' : '✕', {
      fontFamily: font, fontSize: '39px', fontStyle: 'bold',
      color: accentHex,
    }).setOrigin(0.5);
    // Keep a subtle arrival animation without animating interactive controls.
    this.tweens.add({ targets: emblem, scale: { from: 0.88, to: 1 },
      duration: 420, ease: 'Back.easeOut' });

    this.add.text(cx, 224, win ? 'OVERWINNING!' : 'GAME OVER', {
      fontFamily: font, fontSize: '30px', fontStyle: 'bold',
      color: '#f8fbff',
    }).setOrigin(0.5);
    this.add.text(cx, 261,
      win ? 'Je hebt deze wereld overwonnen.' : 'Je avontuur eindigt hier.',
      { fontFamily: font, fontSize: '14px', color: '#c1d7e5' },
    ).setOrigin(0.5);
    this.add.text(cx, 294, world.name.toUpperCase(), {
      fontFamily: font, fontSize: '16px', fontStyle: 'bold',
      color: accentHex,
    }).setOrigin(0.5);

    const gap = 12;
    const cardWidth = (panelWidth - 52 - gap) / 2;
    const left = cx - gap / 2 - cardWidth / 2;
    const right = cx + gap / 2 + cardWidth / 2;
    const stat = (x: number, y: number, label: string, value: string): void => {
      this.add.rectangle(x, y, cardWidth, 62, 0x25445e)
        .setStrokeStyle(1, 0x56748b);
      this.add.text(x, y - 16, label, {
        fontFamily: font, fontSize: '11px', color: '#b9cedf',
      }).setOrigin(0.5);
      this.add.text(x, y + 12, value, {
        fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
    };
    stat(left, 360, 'BEREIKTE KAMER', report.reachedRoom + '/' + CHAPTER_ROOM_COUNT);
    stat(right, 360, 'VIJANDEN VERSLAGEN', String(report.enemiesDefeated));
    stat(left, 430, 'KAMERS VOLTOOID', String(report.roomsCleared));
    stat(right, 430, 'BOSSEN VERSLAGEN', String(report.bossesDefeated));

    this.add.rectangle(cx, 505, panelWidth - 52, 66, 0x2b4e64)
      .setStrokeStyle(1, 0xa67c34);
    this.add.text(cx, 488, 'GOUD VERDIEND DEZE RUN', {
      fontFamily: font, fontSize: '12px', fontStyle: 'bold', color: '#fbd68d',
    }).setOrigin(0.5);
    this.add.text(cx, 517, '+' + report.earnedGold.toLocaleString('nl-BE') + ' G', {
      fontFamily: font, fontSize: '27px', fontStyle: 'bold', color: '#ffdc73',
    }).setOrigin(0.5);

    this.add.text(cx, 549,
      'Goudsaldo: ' + profile.gold.toLocaleString('nl-BE') + ' G',
      { fontFamily: font, fontSize: '13px', color: '#c7dde9' },
    ).setOrigin(0.5);

    // A compact section for every genuinely collected armor piece, not loot
    // that simply dropped on the ground.
    this.add.rectangle(cx, 623, panelWidth - 52, 124, 0x193950, 0.98)
      .setStrokeStyle(1, 0x4e7894);
    this.add.text(cx - panelWidth / 2 + 30, 580,
      'KLEDIJ GEVONDEN  ·  ' + rewards.length, {
        fontFamily: font, fontSize: '12px', fontStyle: 'bold', color: '#d9f0ff',
      }).setOrigin(0, 0.5);
    if (rewards.length > 2) {
      this.add.text(cx + panelWidth / 2 - 30, 580, 'SCROLL ↓', {
        fontFamily: font, fontSize: '10px', color: '#9fbdd2',
      }).setOrigin(1, 0.5);
    }

    this.add.text(cx, 802, 'Je voortgang en uitrusting blijven bewaard', {
      fontFamily: font, fontSize: '11px', color: '#b5cddd',
    }).setOrigin(0.5);

    this.createEndScreenControls(rewards, panelWidth);
  }

  private createEndScreenControls(rewards: ReturnType<typeof armorRunRewards>, panelWidth: number): void {
    const bounds = homeButtonLayout(GAME_WIDTH);
    const lootBounds = { x: GAME_WIDTH / 2, y: 638, width: panelWidth - 68, height: 77 };
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '⌂   HOME';
    button.setAttribute('aria-label', 'HOME - terug naar het beginscherm');
    Object.assign(button.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0',
      padding: '0',
      border: '2px solid #90edff',
      borderRadius: '13px',
      background: 'linear-gradient(110deg, #098fac, #0db1cb)',
      boxShadow: '0 7px 0 #07556f, 0 12px 30px rgba(0,0,0,0.24)',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '800',
      letterSpacing: '1px',
      cursor: 'pointer',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
    });
    // A real visible DOM button handles clicks, taps, Space, Enter and assistive
    // devices natively. A page reload re-enters BootScene -> MainMenuScene and
    // cannot be blocked by Phaser's old sleeping scene or pointer coordinates.
    let goingHome = false;
    button.addEventListener('click', () => {
      if (goingHome) return;
      goingHome = true;
      window.location.reload();
    });
    // Non-button scrollable list: all rewards remain visible even for lucky
    // runs, without adding more buttons or interfering with HOME.
    const lootList = document.createElement('div');
    lootList.setAttribute('role', 'list');
    lootList.setAttribute('aria-label', 'Kledij gevonden tijdens deze run');
    Object.assign(lootList.style, {
      position: 'fixed',
      zIndex: '2147483646',
      overflowY: 'auto',
      overflowX: 'hidden',
      overscrollBehavior: 'contain',
      touchAction: 'pan-y',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'thin',
      scrollbarColor: '#6795af transparent',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '2px',
      background: 'transparent',
      fontFamily: 'system-ui, sans-serif',
      pointerEvents: 'auto',
      boxSizing: 'border-box',
    });
    if (rewards.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Geen kledij gevonden deze run';
      Object.assign(empty.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#bad0df', fontSize: '13px', height: '100%', textAlign: 'center',
      });
      lootList.appendChild(empty);
    } else {
      for (const item of rewards) {
        const row = document.createElement('div');
        row.setAttribute('role', 'listitem');
        row.setAttribute('aria-label', item.name + ', ' + item.rarity);
        Object.assign(row.style, {
          flex: '0 0 auto', minHeight: '33px', display: 'flex',
          alignItems: 'center', gap: '9px', boxSizing: 'border-box',
          padding: '4px 8px', borderLeft: '3px solid ' + item.color,
          borderRadius: '5px', background: '#25475e',
        });
        const symbol = document.createElement('span');
        symbol.textContent = item.symbol;
        Object.assign(symbol.style, {
          fontSize: '19px', color: item.color, flexShrink: '0',
        });
        const name = document.createElement('span');
        name.textContent = item.name;
        Object.assign(name.style, {
          fontSize: '12px', color: '#f4faff', fontWeight: '700',
          flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        });
        const rarity = document.createElement('span');
        rarity.textContent = item.rarity.toUpperCase();
        Object.assign(rarity.style, {
          fontSize: '10px', color: item.color, fontWeight: '800', flexShrink: '0',
        });
        row.append(symbol, name, rarity);
        lootList.appendChild(row);
      }
    }
    document.body.appendChild(lootList);

    const syncPosition = (): void => {
      const canvas = this.game.canvas.getBoundingClientRect();
      const client = homeButtonClientBounds(bounds, canvas, GAME_WIDTH, GAME_HEIGHT);
      if (!client) return;
      button.style.left = client.left + 'px';
      button.style.top = client.top + 'px';
      button.style.width = client.width + 'px';
      button.style.height = client.height + 'px';
      button.style.fontSize = Math.max(14, 21 * client.width / bounds.width) + 'px';
      const lootClient = homeButtonClientBounds(lootBounds, canvas, GAME_WIDTH, GAME_HEIGHT);
      if (lootClient) {
        lootList.style.left = lootClient.left + 'px';
        lootList.style.top = lootClient.top + 'px';
        lootList.style.width = lootClient.width + 'px';
        lootList.style.height = lootClient.height + 'px';
      }
    };
    document.body.appendChild(button);
    syncPosition();

    const observer = typeof ResizeObserver === 'undefined' ? undefined :
      new ResizeObserver(syncPosition);
    observer?.observe(this.game.canvas);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('orientationchange', syncPosition);
    window.visualViewport?.addEventListener('resize', syncPosition);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('orientationchange', syncPosition);
      window.visualViewport?.removeEventListener('resize', syncPosition);
      button.remove();
      lootList.remove();
    });
  }
}

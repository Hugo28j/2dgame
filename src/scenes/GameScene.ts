import Phaser from 'phaser';

import { GAME_SCENE_KEY, GAME_TITLE } from '../config/constants';
import { ARENA_BOUNDS } from '../config/gameplay';
import { Player } from '../entities/Player';
import { InputController } from '../input/InputController';

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private controls?: InputController;

  public constructor() {
    super(GAME_SCENE_KEY);
  }

  public create(): void {
    this.drawBackdrop();
    this.physics.world.setBounds(
      ARENA_BOUNDS.x,
      ARENA_BOUNDS.y,
      ARENA_BOUNDS.width,
      ARENA_BOUNDS.height,
      true,
      true,
      true,
      true,
    );

    this.player = new Player(
      this,
      ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2,
      ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2,
    );
    this.controls = new InputController(this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  public override update(): void {
    if (!this.player || !this.controls) {
      return;
    }

    this.player.move(this.controls.getMovement());
    this.player.face(this.controls.getAim(this.player.x, this.player.y));
  }

  private drawBackdrop(): void {
    this.cameras.main.setBackgroundColor('#08111f');

    this.add
      .text(18, 24, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
      })
      .setDepth(10);

    this.add
      .text(372, 28, 'KAMER 1', {
        color: '#7dd3fc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.add
      .rectangle(
        ARENA_BOUNDS.x + ARENA_BOUNDS.width / 2,
        ARENA_BOUNDS.y + ARENA_BOUNDS.height / 2,
        ARENA_BOUNDS.width,
        ARENA_BOUNDS.height,
        0x142033,
      )
      .setStrokeStyle(6, 0x334155)
      .setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0x26364c, 0.55);

    for (let x = ARENA_BOUNDS.x + 30; x < ARENA_BOUNDS.x + ARENA_BOUNDS.width; x += 30) {
      grid.lineBetween(x, ARENA_BOUNDS.y, x, ARENA_BOUNDS.y + ARENA_BOUNDS.height);
    }

    for (let y = ARENA_BOUNDS.y + 30; y < ARENA_BOUNDS.y + ARENA_BOUNDS.height; y += 30) {
      grid.lineBetween(ARENA_BOUNDS.x, y, ARENA_BOUNDS.x + ARENA_BOUNDS.width, y);
    }

    this.add
      .text(195, 658, 'WASD · muis om te richten', {
        color: '#64748b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private shutdown(): void {
    this.controls?.destroy();
    this.controls = undefined;
    this.player = undefined;
  }
}

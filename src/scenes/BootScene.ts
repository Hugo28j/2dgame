import Phaser from 'phaser';

import { BOOT_SCENE_KEY, GAME_TITLE } from '../config/constants';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(BOOT_SCENE_KEY);
  }

  public create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, GAME_TITLE, {
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 52, 'Fase 0 · Projectbasis actief', {
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
      })
      .setOrigin(0.5);
  }
}

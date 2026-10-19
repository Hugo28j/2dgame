import Phaser from 'phaser';

import {
  BOOT_SCENE_KEY,
  GAME_SCENE_KEY,
  PLAYER_TEXTURE_KEY,
} from '../config/constants';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(BOOT_SCENE_KEY);
  }

  public create(): void {
    this.createPlayerTexture();
    this.scene.start(GAME_SCENE_KEY);
  }

  private createPlayerTexture(): void {
    if (this.textures.exists(PLAYER_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x22d3ee, 1);
    graphics.fillCircle(24, 24, 16);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillTriangle(25, 15, 46, 24, 25, 33);
    graphics.lineStyle(3, 0x0e7490, 1);
    graphics.strokeCircle(24, 24, 16);
    graphics.generateTexture(PLAYER_TEXTURE_KEY, 48, 48);
    graphics.destroy();
  }
}

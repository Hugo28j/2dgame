import Phaser from 'phaser';

import {
  ARROW_TEXTURE_KEY,
  BOOT_SCENE_KEY,
  GAME_SCENE_KEY,
  PLAYER_TEXTURE_KEY,
  SLIME_TEXTURE_KEY,
  TARGET_TEXTURE_KEY,
} from '../config/constants';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(BOOT_SCENE_KEY);
  }

  public create(): void {
    this.createPlayerTexture();
    this.createArrowTexture();
    this.createTargetTexture();
    this.createSlimeTexture();
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

  private createArrowTexture(): void {
    if (this.textures.exists(ARROW_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillRect(1, 3, 16, 3);
    graphics.fillStyle(0xf59e0b, 1);
    graphics.fillTriangle(14, 0, 23, 4, 14, 8);
    graphics.generateTexture(ARROW_TEXTURE_KEY, 24, 9);
    graphics.destroy();
  }

  private createTargetTexture(): void {
    if (this.textures.exists(TARGET_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x7f1d1d, 1);
    graphics.fillCircle(20, 20, 19);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillCircle(20, 20, 13);
    graphics.fillStyle(0xdc2626, 1);
    graphics.fillCircle(20, 20, 7);
    graphics.generateTexture(TARGET_TEXTURE_KEY, 40, 40);
    graphics.destroy();
  }

  private createSlimeTexture(): void {
    if (this.textures.exists(SLIME_TEXTURE_KEY)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x65a30d, 1);
    graphics.fillRoundedRect(2, 7, 36, 30, 13);
    graphics.fillStyle(0xa3e635, 1);
    graphics.fillCircle(12, 17, 6);
    graphics.fillCircle(28, 17, 6);
    graphics.fillStyle(0x132a13, 1);
    graphics.fillCircle(13, 18, 2);
    graphics.fillCircle(27, 18, 2);
    graphics.lineStyle(2, 0x3f6212, 1);
    graphics.lineBetween(15, 28, 25, 28);
    graphics.generateTexture(SLIME_TEXTURE_KEY, 40, 40);
    graphics.destroy();
  }
}

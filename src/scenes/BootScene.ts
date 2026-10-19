import Phaser from 'phaser';
import type { EnemyKind } from '../enemies/enemyConfig';
import { createWorldCharacterTextures } from '../enemies/worldCharacterArt';
import { createHeroArt } from '../heroes/heroArt';

import {
  ARROW_TEXTURE_KEY,
  BOOT_SCENE_KEY,
  MENU_SCENE_KEY,
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
    this.createEnemyTextures();
    createWorldCharacterTextures(this);
    createHeroArt(this);
    this.createWeaponTextures();
    this.scene.start(MENU_SCENE_KEY);
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
  private createWeaponTextures(): void {
    const colors: Record<string, number> = {
      'bolt-projectile': 0xfca5a5,
      'magic-projectile': 0xc084fc,
      'dagger-projectile': 0xe2e8f0,
      'lightning-projectile': 0x67e8f9,
    };
    Object.entries(colors).forEach(([key, color]) => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(color);
      if (key === 'magic-projectile') {
        graphics.fillCircle(12, 12, 9);
        graphics.fillStyle(0xffffff); graphics.fillCircle(12, 12, 3);
      } else if (key === 'lightning-projectile') {
        graphics.fillTriangle(6, 3, 21, 10, 11, 21);
        graphics.fillStyle(0xffffff); graphics.fillCircle(12, 12, 3);
      } else {
        graphics.fillRect(2, 9, 20, 6);
        graphics.fillTriangle(14, 3, 24, 12, 14, 21);
      }
      graphics.generateTexture(key, 24, 24);
      graphics.destroy();
    });
  }

  private createEnemyTextures(): void {
    const colors: Record<Exclude<EnemyKind, 'slime'>, number> = {
      archer: 0x84cc16, charger: 0xef4444, mage: 0xa78bfa,
      tank: 0x94a3b8, bomber: 0xf97316, boss: 0xf59e0b,
    };
    for (const kind of Object.keys(colors) as Array<Exclude<EnemyKind, 'slime'>>) {
      const key = 'enemy-' + kind;
      if (this.textures.exists(key)) continue;
      const gfx = this.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(0x0f172a); gfx.fillCircle(24, 24, 21);
      gfx.fillStyle(colors[kind]); gfx.fillCircle(24, 24, kind === 'boss' ? 21 : 17);
      gfx.lineStyle(3, 0xf1f5f9); gfx.strokeCircle(24, 24, 18);
      // Original enemy silhouettes; graphical polish follows in phase 9.
      if (kind === 'archer') {
        gfx.fillStyle(0x132a13); gfx.fillTriangle(10, 18, 38, 18, 24, 35);
      } else if (kind === 'charger') {
        gfx.fillStyle(0xfee2e2); gfx.fillTriangle(8, 4, 16, 18, 4, 18);
        gfx.fillTriangle(40, 4, 44, 18, 32, 18);
      } else if (kind === 'mage') {
        gfx.fillStyle(0xffffff); gfx.fillCircle(24, 24, 8);
      } else if (kind === 'tank') {
        gfx.fillStyle(0x334155); gfx.fillRect(15, 15, 18, 18);
      } else if (kind === 'bomber') {
        gfx.fillStyle(0xfef08a); gfx.fillCircle(24, 21, 7);
      } else {
        gfx.fillStyle(0x78350f); gfx.fillTriangle(8, 6, 22, 24, 4, 19);
        gfx.fillTriangle(40, 6, 44, 19, 26, 24);
      }
      gfx.generateTexture(key, 48, 48);
      gfx.destroy();
    }
    if (!this.textures.exists('enemy-bullet')) {
      const gfx = this.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(0xffffff); gfx.fillCircle(8, 8, 6);
      gfx.generateTexture('enemy-bullet', 16, 16);
      gfx.destroy();
    }
  }

}

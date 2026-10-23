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
    // Ranger's real yew arrow: green fletching, wooden shaft and steel broadhead.
    graphics.fillStyle(0xa9c66d, 1);
    graphics.fillTriangle(1, 1, 9, 5, 1, 5);
    graphics.fillTriangle(1, 9, 9, 5, 1, 5);
    graphics.fillStyle(0x4f321f, 1); graphics.fillRect(7, 4, 17, 3);
    graphics.fillStyle(0xdbe3df, 1);
    graphics.fillTriangle(30, 5, 22, 1, 22, 9);
    graphics.fillStyle(0xffffff, .75);graphics.fillTriangle(28,4,23,3,23,5);
    graphics.generateTexture(ARROW_TEXTURE_KEY, 31, 10);
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
      'magic-projectile': 0xc084fc,
      'lightning-projectile': 0x67e8f9,
      'ember-projectile': 0xfb923c,
      'fire-projectile': 0xfdba74,
      'void-projectile': 0xa855f7,
    };
    Object.entries(colors).forEach(([key, color]) => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(color);
      if (['magic-projectile', 'rune-projectile', 'ember-projectile',
        'fire-projectile', 'void-projectile'].includes(key)) {
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

    // Hunter Crossbow bolt uses the same material palette but is shorter,
    // thicker and heavier than the Ascent Bow arrow.
    const boltKey='bolt-projectile';
    if(!this.textures.exists(boltKey)){
      const bolt=this.make.graphics({x:0,y:0},false);
      bolt.fillStyle(0x8fab62,1);bolt.fillTriangle(1,1,8,6,1,6);
      bolt.fillTriangle(1,11,8,6,1,6);
      bolt.fillStyle(0x55351f,1);bolt.fillRect(7,4,15,4);
      bolt.fillStyle(0xb9c5c2,1);bolt.fillTriangle(29,6,20,1,20,11);
      bolt.fillStyle(0xf5faf8,.8);bolt.fillTriangle(27,5,21,3,21,6);
      bolt.generateTexture(boltKey,30,12);bolt.destroy();
    }

    // Rune Tome uses one enchanted sphere rather than the old plain bullet.
    // The entire rune sprite rotates independently of its flight direction.
    const runeKey = 'rune-projectile';
    if (!this.textures.exists(runeKey)) {
      const g = this.make.graphics({ x:0, y:0 },false);
      // Outer mystic aura intentionally extends beyond the actual collision orb.
      g.fillStyle(0xa78bfa,0.17);g.fillCircle(12,12,12);
      g.fillStyle(0x6d28d9,0.74);g.fillCircle(12,12,10);
      g.fillStyle(0xc4b5fd,0.86);g.fillCircle(12,12,8);
      g.fillStyle(0xf5e8ff,0.62);g.fillCircle(9,8,3);
      g.lineStyle(1.2,0xffffff,0.91);g.strokeCircle(12,12,8.5);
      g.lineStyle(1.3,0x6b21a8,0.86);
      // A compact rune: central diamond and 4 radial glyphs.
      g.lineBetween(12,6,17,12);g.lineBetween(17,12,12,18);
      g.lineBetween(12,18,7,12);g.lineBetween(7,12,12,6);
      g.lineBetween(12,3,12,7);g.lineBetween(12,17,12,21);
      g.lineBetween(3,12,7,12);g.lineBetween(17,12,21,12);
      g.fillStyle(0xffffff,0.98);g.fillCircle(12,12,2);
      g.generateTexture(runeKey,24,24);
      g.destroy();
    }

    // Fase 7: a translucent, sharpened ice-spike rather than a grey dagger.
    // The long axis is horizontal so Phaser projectile rotation aims the tip.
    const spikeKey = 'dagger-projectile';
    if (!this.textures.exists(spikeKey)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      // Soft frosted crystal aura, narrower than its collision-free bloom.
      g.fillStyle(0x7dd3fc, 0.17);
      g.fillTriangle(0, 11, 19, 1, 48, 11);
      g.fillTriangle(0, 11, 19, 21, 48, 11);
      // Crystal shell facets: a thick heel tapers to a single bright point.
      g.fillStyle(0x74cce8, 0.76);
      g.fillTriangle(4, 11, 17, 3, 46, 11);
      g.fillStyle(0xd6f7ff, 0.81);
      g.fillTriangle(4, 11, 17, 19, 46, 11);
      g.fillStyle(0x4eaccd, 0.65);
      g.fillTriangle(12, 11, 17, 19, 34, 12);
      g.fillStyle(0xf0fdff, 0.89);
      g.fillTriangle(12, 10, 17, 5, 45, 11);
      // Fine inner lattice and icy refraction streaks.
      g.lineStyle(1.3, 0xffffff, 0.94);
      g.lineBetween(6, 11, 46, 11);
      g.lineBetween(17, 3, 28, 11);
      g.lineBetween(17, 19, 28, 11);
      g.lineStyle(1, 0x399bbd, 0.8);
      g.lineBetween(25, 8, 36, 11);
      g.lineBetween(25, 14, 36, 11);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(18, 11, 2);
      g.generateTexture(spikeKey, 48, 22);
      g.destroy();
    }
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

import Phaser from 'phaser';
import { advanceCoinTowardPlayer, type CoinPosition } from '../progression/coinRewards';

const COIN_TEXTURE = 'pickup-gold-coin';

/** One lightweight, non-physics coin. Individual coins stay on the floor
 * until the player comes close enough for the magnetic attraction. */
export class CoinPickup extends Phaser.GameObjects.Image {
  public readonly value: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    if (!scene.textures.exists(COIN_TEXTURE)) {
      const gfx = scene.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(0x78350f);
      gfx.fillCircle(12, 12, 11);
      gfx.fillStyle(0xfbbf24);
      gfx.fillCircle(12, 12, 9);
      gfx.lineStyle(2, 0xfef08a);
      gfx.strokeCircle(12, 12, 8);
      gfx.lineStyle(2, 0xb45309);
      gfx.lineBetween(11, 7, 11, 17);
      gfx.lineBetween(14, 7, 14, 17);
      gfx.generateTexture(COIN_TEXTURE, 24, 24);
      gfx.destroy();
    }
    super(scene, x, y, COIN_TEXTURE);
    this.value = value;
    scene.add.existing(this);
    this.setDepth(18);
    this.setAlpha(0.95);
  }

  public tick(target: Readonly<CoinPosition>, deltaMs: number): boolean {
    if (!this.active) return false;
    const next = advanceCoinTowardPlayer(this, target, deltaMs);
    this.setPosition(next.x, next.y);
    return next.collected;
  }
}

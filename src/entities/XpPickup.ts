import Phaser from 'phaser';
import { advanceCoinTowardPlayer, type CoinPosition } from '../progression/coinRewards';

const TEXTURE = 'pickup-blue-xp-crystal';

/** Magnetic blue experience gem; no physics body required. */
export class XpPickup extends Phaser.GameObjects.Image {
  public readonly value: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    if (!scene.textures.exists(TEXTURE)) {
      const gfx = scene.make.graphics({ x: 0, y: 0 }, false);
      gfx.fillStyle(0x0c4a6e, 0.7);
      gfx.fillCircle(12, 12, 12);
      gfx.fillStyle(0x38bdf8);
      gfx.fillPoints([new Phaser.Math.Vector2(12, 1), new Phaser.Math.Vector2(21, 11),
        new Phaser.Math.Vector2(12, 23), new Phaser.Math.Vector2(3, 11)], true);
      gfx.fillStyle(0xbae6fd);
      gfx.fillTriangle(12, 3, 12, 20, 5, 11);
      gfx.lineStyle(1, 0xe0f2fe);
      gfx.strokePoints([new Phaser.Math.Vector2(12, 1), new Phaser.Math.Vector2(21, 11),
        new Phaser.Math.Vector2(12, 23), new Phaser.Math.Vector2(3, 11)], true);
      gfx.generateTexture(TEXTURE, 24, 24);
      gfx.destroy();
    }
    super(scene, x, y, TEXTURE);
    this.value = value;
    scene.add.existing(this);
    this.setDepth(19);
  }

  public tick(player: Readonly<CoinPosition>, deltaMs: number): boolean {
    if (!this.active) return false;
    const next = advanceCoinTowardPlayer(this, player, deltaMs);
    this.setPosition(next.x, next.y);
    return next.collected;
  }
}

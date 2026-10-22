import Phaser from 'phaser';
import { advanceCoinTowardPlayer, type CoinPosition } from '../progression/coinRewards';
import type { ArmorItem } from '../progression/armor';
import { ensureArmorIcon } from '../ui/armorIconArt';

/** The same detailed, hero- and rarity-specific artwork is used on the ground. */
export class ArmorPickup extends Phaser.GameObjects.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number, public readonly item: ArmorItem) {
    super(scene, x, y, ensureArmorIcon(scene, item));
    scene.add.existing(this);
    this.setDepth(20);
    this.setDisplaySize(38, 38);
    scene.tweens.add({ targets: this, scale: this.scale * 1.11, duration: 730,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  public tick(player: Readonly<CoinPosition>, delta: number): boolean {
    if (!this.active) return false;
    const next = advanceCoinTowardPlayer(this, player, delta);
    this.setPosition(next.x, next.y);
    return next.collected;
  }
}

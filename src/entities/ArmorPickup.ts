import Phaser from 'phaser';
import { advanceCoinTowardPlayer, type CoinPosition } from '../progression/coinRewards';
import { armorDefinition, RARITY_CONFIG, type ArmorItem, type ArmorSlot } from '../progression/armor';

/** Drawn gear silhouettes: a crested helmet, armored vest, and pair of boots. */
function createTexture(scene: Phaser.Scene, slot: ArmorSlot, color: number): string {
  const key = 'armor-loot-' + slot + '-' + color.toString(16);
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x0b1220, .85);
  g.fillCircle(18, 18, 17);
  g.lineStyle(2, color);
  g.strokeCircle(18, 18, 15);
  g.fillStyle(color);
  if (slot === 'helm') {
    g.fillRoundedRect(9, 11, 18, 16, 6);
    g.fillRect(7, 22, 6, 8);
    g.fillRect(23, 22, 6, 8);
    g.fillTriangle(18, 5, 23, 13, 13, 13);
    g.fillStyle(0x0b1220);
    g.fillRect(13, 20, 10, 5);
  } else if (slot === 'body') {
    g.fillPoints([
      new Phaser.Math.Vector2(12, 7), new Phaser.Math.Vector2(18, 10),
      new Phaser.Math.Vector2(24, 7), new Phaser.Math.Vector2(31, 13),
      new Phaser.Math.Vector2(27, 19), new Phaser.Math.Vector2(26, 30),
      new Phaser.Math.Vector2(10, 30), new Phaser.Math.Vector2(9, 19),
      new Phaser.Math.Vector2(5, 13),
    ], true);
    g.lineStyle(2, 0x0b1220);
    g.lineBetween(18, 11, 18, 29);
    g.lineBetween(11, 19, 25, 19);
  } else {
    g.fillRoundedRect(9, 7, 7, 15, 2);
    g.fillRoundedRect(20, 7, 7, 15, 2);
    g.fillRoundedRect(7, 20, 12, 8, 2);
    g.fillRoundedRect(18, 20, 12, 8, 2);
    g.fillStyle(0x0b1220);
    g.fillRect(17, 22, 3, 6);
  }
  g.generateTexture(key, 36, 36);
  g.destroy();
  return key;
}

export class ArmorPickup extends Phaser.GameObjects.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number, public readonly item: ArmorItem) {
    const definition = armorDefinition(item);
    super(scene, x, y, createTexture(scene, definition.slot, RARITY_CONFIG[item.rarity].color));
    scene.add.existing(this);
    this.setDepth(20);
    this.setScale(.9);
    scene.tweens.add({ targets: this, scale: 1.06, duration: 730,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  public tick(player: Readonly<CoinPosition>, delta: number): boolean {
    if (!this.active) return false;
    const next = advanceCoinTowardPlayer(this, player, delta);
    this.setPosition(next.x, next.y);
    return next.collected;
  }
}

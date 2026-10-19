import Phaser from 'phaser';

import type { Damageable } from '../combat/damage';
import { TARGET_TEXTURE_KEY } from '../config/constants';

export class TrainingTarget extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public readonly defense = 12;
  private readonly maxHp = 80;
  private currentHp = this.maxHp;
  private readonly healthBar: Phaser.GameObjects.Graphics;

  public constructor(
    scene: Phaser.Scene,
    public readonly targetId: string,
    x: number,
    y: number,
  ) {
    super(scene, x, y, TARGET_TEXTURE_KEY);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);

    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(18, 2, 2);
      body.setAllowGravity(false);
      body.setImmovable(true);
    }

    this.healthBar = scene.add.graphics().setDepth(12);
    this.drawHealthBar();
  }

  public receiveDamage(amount: number): boolean {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.drawHealthBar();
    return this.currentHp === 0;
  }

  public showHit(): void {
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.active) {
        this.clearTint();
      }
    });
  }

  public playDefeat(onComplete: () => void): void {
    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.enable = false;
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.65,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroy();
        onComplete();
      },
    });
  }

  public override destroy(fromScene?: boolean): void {
    this.healthBar.destroy();
    super.destroy(fromScene);
  }

  private drawHealthBar(): void {
    const width = 44;
    const ratio = this.currentHp / this.maxHp;
    this.healthBar.clear();
    this.healthBar.fillStyle(0x020617, 0.9);
    this.healthBar.fillRoundedRect(this.x - width / 2, this.y - 30, width, 6, 2);
    this.healthBar.fillStyle(0x4ade80, 1);
    this.healthBar.fillRoundedRect(this.x - width / 2 + 1, this.y - 29, (width - 2) * ratio, 4, 1);
  }
}

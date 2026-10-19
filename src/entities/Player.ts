import Phaser from 'phaser';

import { PLAYER_SPEED } from '../config/gameplay';
import { PLAYER_TEXTURE_KEY } from '../config/constants';
import type { Vector2Value } from '../input/vectorMath';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURE_KEY);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(20);

    const body = this.body;
    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.setCircle(16, 8, 8);
      body.setCollideWorldBounds(true);
    }
  }

  public move(direction: Readonly<Vector2Value>): void {
    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
  }

  public face(direction: Readonly<Vector2Value>): void {
    this.setRotation(Math.atan2(direction.y, direction.x));
  }
}

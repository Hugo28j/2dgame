import Phaser from 'phaser';

import { PointerOwnership } from './PointerOwnership';
import { joystickVector, type Vector2Value } from './vectorMath';

interface VirtualJoystickOptions {
  x: number;
  y: number;
  radius: number;
  interactionSize: number;
  deadZone: number;
  label: string;
  accentColor: number;
}

export class VirtualJoystick {
  private readonly ownership = new PointerOwnership();
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly label: Phaser.GameObjects.Text;
  private value: Vector2Value = { x: 0, y: 0 };

  private readonly handleDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.ownership.claim(pointer.id)) {
      this.updateFromPointer(pointer);
    }
  };

  private readonly handleMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.isDown && this.ownership.owns(pointer.id)) {
      this.updateFromPointer(pointer);
    }
  };

  private readonly handleUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.ownership.release(pointer.id)) {
      this.centerThumb();
    }
  };

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: VirtualJoystickOptions,
  ) {
    this.base = scene.add
      .circle(options.x, options.y, options.radius, 0x0f172a, 0.7)
      .setStrokeStyle(3, options.accentColor, 0.55)
      .setDepth(100).setScrollFactor(0);

    this.thumb = scene.add
      .circle(options.x, options.y, options.radius * 0.43, options.accentColor, 0.72)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(102).setScrollFactor(0);

    this.label = scene.add
      .text(options.x, options.y + options.radius + 15, options.label, {
        color: '#cbd5e1',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(102);

    this.zone = scene.add
      .zone(options.x, options.y, options.interactionSize, options.interactionSize)
      .setInteractive()
      .setDepth(103).setScrollFactor(0);

    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.handleDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handleMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handleUp);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp);
  }

  public get vector(): Readonly<Vector2Value> {
    return this.value;
  }

  public get isActive(): boolean {
    return this.ownership.isOwned;
  }

  public reset(): void {
    this.ownership.reset();
    this.centerThumb();
  }

  public destroy(): void {
    this.zone.off(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.handleDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handleMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handleUp);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handleUp);
    this.zone.destroy();
    this.base.destroy();
    this.thumb.destroy();
    this.label.destroy();
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    this.value = joystickVector(
      pointer.x - this.options.x,
      pointer.y - this.options.y,
      this.options.radius,
      this.options.deadZone,
    );

    this.thumb.setPosition(
      this.options.x + this.value.x * this.options.radius,
      this.options.y + this.value.y * this.options.radius,
    );
  }

  private centerThumb(): void {
    this.value = { x: 0, y: 0 };
    this.thumb.setPosition(this.options.x, this.options.y);
  }
}

import Phaser from 'phaser';

import { JOYSTICK_CONFIG } from '../config/gameplay';
import { VirtualJoystick } from './VirtualJoystick';
import {
  clampVector,
  normalizeVector,
  type Vector2Value,
} from './vectorMath';

export class InputController {
  private readonly movementJoystick: VirtualJoystick;
  private readonly aimJoystick: VirtualJoystick;
  private readonly keys: Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>;
  private lastAim: Vector2Value = { x: 1, y: 0 };

  private readonly reset = (): void => {
    this.movementJoystick.reset();
    this.aimJoystick.reset();
  };

  public constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.movementJoystick = new VirtualJoystick(scene, {
      x: JOYSTICK_CONFIG.movementX,
      y: JOYSTICK_CONFIG.y,
      radius: JOYSTICK_CONFIG.radius,
      interactionSize: JOYSTICK_CONFIG.interactionSize,
      deadZone: JOYSTICK_CONFIG.deadZone,
      label: 'BEWEGEN',
      accentColor: 0x38bdf8,
    });

    this.aimJoystick = new VirtualJoystick(scene, {
      x: JOYSTICK_CONFIG.aimX,
      y: JOYSTICK_CONFIG.y,
      radius: JOYSTICK_CONFIG.radius,
      interactionSize: JOYSTICK_CONFIG.interactionSize,
      deadZone: JOYSTICK_CONFIG.deadZone,
      label: 'RICHT + VUUR',
      accentColor: 0xf59e0b,
    });

    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset);
    window.addEventListener('blur', this.reset);
    window.addEventListener('pointercancel', this.reset);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public getMovement(): Vector2Value {
    if (this.movementJoystick.isActive) {
      return { ...this.movementJoystick.vector };
    }

    const horizontal = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    const vertical = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
    return clampVector(horizontal, vertical);
  }

  public getAim(playerX: number, playerY: number): Vector2Value {
    const joystickAim = this.aimJoystick.vector;

    if (Math.hypot(joystickAim.x, joystickAim.y) > 0) {
      this.lastAim = normalizeVector(joystickAim.x, joystickAim.y);
      return { ...this.lastAim };
    }

    const mousePointer = this.scene.input.manager.mousePointer;

    if (!this.aimJoystick.isActive && mousePointer?.active) {
      const deltaX = mousePointer.worldX - playerX;
      const deltaY = mousePointer.worldY - playerY;

      if (Math.hypot(deltaX, deltaY) > 8) {
        this.lastAim = normalizeVector(deltaX, deltaY);
      }
    }

    return { ...this.lastAim };
  }

  public isShooting(): boolean {
    if (this.aimJoystick.isActive) {
      const aim = this.aimJoystick.vector;
      return Math.hypot(aim.x, aim.y) > 0;
    }

    return this.scene.input.manager.mousePointer?.primaryDown ?? false;
  }

  public destroy(): void {
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.reset);
    window.removeEventListener('blur', this.reset);
    window.removeEventListener('pointercancel', this.reset);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.movementJoystick.destroy();
    this.aimJoystick.destroy();
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.reset();
    }
  };
}

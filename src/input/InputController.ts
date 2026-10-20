import Phaser from 'phaser';

import { JOYSTICK_CONFIG } from '../config/gameplay';
import { progressStore } from '../progression/ProgressStore';
import {
  CONTROL_ACTIONS, keyboardVector, mouseButtonKey, normalizeBindKey,
  type ControlAction, type KeyBindings,
} from './keyBindings';
import { VirtualJoystick } from './VirtualJoystick';
import { normalizeVector, type Vector2Value } from './vectorMath';

export class InputController {
  private readonly movementJoystick: VirtualJoystick;
  private readonly aimJoystick: VirtualJoystick;
  private readonly bindings: Readonly<KeyBindings>;
  private readonly heldKeys = new Set<string>();
  private readonly pressedAbilities = new Set<ControlAction>();
  private readonly releasedAbilities = new Set<ControlAction>();
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
  private lastAim: Vector2Value = { x: 1, y: 0 };
  private lastTouchTime = -Infinity;

  private readonly reset = (): void => {
    this.movementJoystick.reset();
    this.aimJoystick.reset();
    this.heldKeys.clear();
    this.pressedAbilities.clear();
    this.releasedAbilities.clear();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const key = normalizeBindKey(event.key);
    if (!key) return;
    const action = CONTROL_ACTIONS.find(id => this.bindings[id].includes(key));
    if (!action) return;
    if (['SPACE', 'ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT'].includes(key)) {
      event.preventDefault();
    }
    if (this.heldKeys.has(key)) return;
    this.heldKeys.add(key);
    if (action === 'dash' || action === 'fireNova' || action === 'iceBlast') {
      this.pressedAbilities.add(action);
    }
  };

  private readonly onTouchPointer = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') this.lastTouchTime = Date.now();
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    // Browsers may synthesize a mouse click after a mobile touch. Do not fire
    // an extra bullet or skill when using touch joysticks and ability buttons.
    if (Date.now() - this.lastTouchTime < 850) return;
    const key = mouseButtonKey(event.button);
    if (!key) return;
    const action = CONTROL_ACTIONS.find(id => this.bindings[id].includes(key));
    if (!action) return;
    if (event.button !== 0) event.preventDefault();
    if (this.heldKeys.has(key)) return;
    this.heldKeys.add(key);
    if (action === 'dash' || action === 'fireNova' || action === 'iceBlast') {
      this.pressedAbilities.add(action);
    }
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    const key = mouseButtonKey(event.button);
    if (key && this.heldKeys.has(key) && event.button !== 0) event.preventDefault();
    if (key && this.heldKeys.has(key)) {
      const action = CONTROL_ACTIONS.find(id => this.bindings[id].includes(key));
      if (action === 'fireNova' || action === 'iceBlast') this.releasedAbilities.add(action);
    }
    if (key) this.heldKeys.delete(key);
  };

  private readonly preventContextMenu = (event: MouseEvent): void => {
    if (CONTROL_ACTIONS.some(action => this.bindings[action].includes('MOUSE2'))) {
      event.preventDefault();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const key = normalizeBindKey(event.key);
    if (key && this.heldKeys.has(key)) {
      const action = CONTROL_ACTIONS.find(id => this.bindings[id].includes(key));
      if (action === 'fireNova' || action === 'iceBlast') this.releasedAbilities.add(action);
    }
    if (key) this.heldKeys.delete(key);
  };

  public constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');
    this.keyboard = keyboard;
    this.bindings = progressStore.current.settings.keyBindings;

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

    this.keyboard.on('keydown', this.onKeyDown);
    this.keyboard.on('keyup', this.onKeyUp);
    // Mouse bindings only apply on the game canvas. Mouseup listens globally so
    // releasing outside the canvas never leaves a stuck held button.
    scene.game.canvas.addEventListener('pointerdown', this.onTouchPointer);
    scene.game.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    scene.game.canvas.addEventListener('contextmenu', this.preventContextMenu);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset);
    window.addEventListener('blur', this.reset);
    window.addEventListener('pointercancel', this.reset);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public cancelTouches(): void {
    this.movementJoystick.reset();
    this.aimJoystick.reset();
    this.pressedAbilities.clear();
    this.releasedAbilities.clear();
  }

  public getMovement(): Vector2Value {
    if (this.movementJoystick.isActive) return { ...this.movementJoystick.vector };
    return keyboardVector(this.heldKeys, this.bindings);
  }

  /** Consumes one key press; holding the key never repeats a skill. */
  public consumeAbilityPressed(action: 'dash' | 'fireNova' | 'iceBlast'): boolean {
    const pressed = this.pressedAbilities.has(action);
    this.pressedAbilities.delete(action);
    return pressed;
  }

  public consumeAbilityReleased(action: 'fireNova' | 'iceBlast'): boolean {
    const released = this.releasedAbilities.has(action);
    this.releasedAbilities.delete(action);
    return released;
  }

  public getAbilityLabel(action: 'dash' | 'fireNova' | 'iceBlast'): string {
    return this.bindings[action].join(' / ');
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
    return this.bindings.shoot.some(key => this.heldKeys.has(key));
  }

  public destroy(): void {
    this.keyboard.off('keydown', this.onKeyDown);
    this.keyboard.off('keyup', this.onKeyUp);
    this.scene.game.canvas.removeEventListener('pointerdown', this.onTouchPointer);
    this.scene.game.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.scene.game.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.reset);
    window.removeEventListener('blur', this.reset);
    window.removeEventListener('pointercancel', this.reset);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.movementJoystick.destroy();
    this.aimJoystick.destroy();
    this.heldKeys.clear();
    this.pressedAbilities.clear();
    this.releasedAbilities.clear();
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.reset();
  };
}

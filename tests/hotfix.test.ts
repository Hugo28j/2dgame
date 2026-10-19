import { describe, expect, it } from 'vitest';
import { addAndLaunch } from '../src/combat/launchProjectile';
import { keyboardMovement } from '../src/input/keyboardMovement';
import { addBoundedEnemy } from '../src/enemies/addBoundedEnemy';

const keys = (pressed: string[]) => Object.fromEntries(
  ['w', 'z', 'a', 'q', 's', 'd'].map(key => [key, pressed.includes(key)]),
) as Parameters<typeof keyboardMovement>[0];

describe('AZERTY / QWERTY desktop controls', () => {
  it('accepts both W and Z for up, A and Q for left', () => {
    expect(keyboardMovement(keys(['w']))).toEqual({ x: 0, y: -1 });
    expect(keyboardMovement(keys(['z']))).toEqual({ x: 0, y: -1 });
    expect(keyboardMovement(keys(['a']))).toEqual({ x: -1, y: 0 });
    expect(keyboardMovement(keys(['q']))).toEqual({ x: -1, y: 0 });
    expect(keyboardMovement(keys(['s']))).toEqual({ x: 0, y: 1 });
    expect(keyboardMovement(keys(['d']))).toEqual({ x: 1, y: 0 });
  });

  it('does not double movement speed for simultaneous layout keys or diagonals', () => {
    expect(keyboardMovement(keys(['w', 'z']))).toEqual({ x: 0, y: -1 });
    expect(keyboardMovement(keys(['a', 'q']))).toEqual({ x: -1, y: 0 });
    const azerty = keyboardMovement(keys(['z', 'd']));
    expect(Math.hypot(azerty.x, azerty.y)).toBeCloseTo(1);
    expect(azerty.x).toBeCloseTo(Math.SQRT1_2);
    expect(azerty.y).toBeCloseTo(-Math.SQRT1_2);
    expect(keyboardMovement(keys(['w', 's']))).toEqual({ x: 0, y: 0 });
    expect(keyboardMovement(keys(['a', 'd']))).toEqual({ x: 0, y: 0 });
  });
});

describe('arcade group initialization regression', () => {
  it('sets projectile velocity AFTER the group has reset it to zero', () => {
    const events: string[] = [];
    const shot = {
      vx: 0, vy: 0,
      setVelocity(x: number, y: number) {
        this.vx = x;
        this.vy = y;
        events.push('velocity');
      },
    };
    const group = {
      add(sprite: typeof shot) {
        sprite.vx = 0;
        sprite.vy = 0;
        events.push('add');
      },
    };
    expect(addAndLaunch(group, shot, { x: 3, y: 4 }, 500)).toBe(shot);
    expect(events).toEqual(['add', 'velocity']);
    expect(shot.vx).toBeCloseTo(300);
    expect(shot.vy).toBeCloseTo(400);
  });

  it('does not produce NaN velocity for invalid or zero aim vectors', () => {
    const shot = { x: 1, y: 1, setVelocity(x: number, y: number) { this.x = x; this.y = y; } };
    const group = { add(_: typeof shot) { /* physics group registration */ } };
    addAndLaunch(group, shot, { x: 0, y: 0 }, 200);
    expect([shot.x, shot.y]).toEqual([0, 0]);
    addAndLaunch(group, shot, { x: 1, y: 0 }, Infinity);
    expect([shot.x, shot.y]).toEqual([0, 0]);
  });

  it('restores world-bound collisions after a group resets its enemy defaults', () => {
    const events: string[] = [];
    const enemy = {
      bounded: true,
      setCollideWorldBounds(value: boolean) { this.bounded = value; events.push('bounds'); },
    };
    const group = {
      add(sprite: typeof enemy) { sprite.bounded = false; events.push('add'); },
    };
    expect(addBoundedEnemy(group, enemy)).toBe(enemy);
    expect(events).toEqual(['add', 'bounds']);
    expect(enemy.bounded).toBe(true);
  });
});

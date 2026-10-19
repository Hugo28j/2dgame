import { describe, expect, it } from 'vitest';

import {
  BOOT_SCENE_KEY,
  GAME_HEIGHT,
  GAME_TITLE,
  GAME_WIDTH,
} from '../src/config/constants';

describe('phase 0 game constants', () => {
  it('uses the intended portrait canvas', () => {
    expect(GAME_HEIGHT).toBeGreaterThan(GAME_WIDTH);
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(844);
  });

  it('provides stable identifiers for the boot scene', () => {
    expect(GAME_TITLE).toBe('Dungeon Ascent');
    expect(BOOT_SCENE_KEY).toBe('BootScene');
  });
});

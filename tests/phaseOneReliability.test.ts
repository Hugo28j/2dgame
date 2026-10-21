import { describe, expect, it } from 'vitest';

import { DESKTOP_GAME_WIDTH, MOBILE_GAME_WIDTH } from '../src/config/constants';
import { displayedHp } from '../src/ui/displayValues';
import {
  clientPointInGame, containsScreenPoint, endScreenLayout,
} from '../src/ui/endScreenLayout';

describe('visible HP values', () => {
  it('always rounds finite combat precision upward for display', () => {
    expect(displayedHp(1.0000002)).toBe(2);
    expect(displayedHp(35.2)).toBe(36);
    expect(displayedHp(100)).toBe(100);
  });

  it('never exposes invalid numeric text', () => {
    expect(displayedHp(Number.NaN)).toBe(0);
    expect(displayedHp(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('win and death screen button geometry', () => {
  it('centers the visual and touch targets at mobile and desktop widths', () => {
    for (const width of [MOBILE_GAME_WIDTH, DESKTOP_GAME_WIDTH]) {
      const layout = endScreenLayout(width);
      expect(layout.centerX).toBe(width / 2);
      expect(layout.replay.x).toBe(layout.centerX);
      expect(layout.menu.x).toBe(layout.centerX);
      expect(containsScreenPoint(layout.replay, layout.replay.x, layout.replay.y)).toBe(true);
      expect(containsScreenPoint(layout.menu, layout.menu.x, layout.menu.y)).toBe(true);
    }
  });

  it('does not activate a different button or an unrelated arena point', () => {
    const layout = endScreenLayout(MOBILE_GAME_WIDTH);
    expect(containsScreenPoint(layout.replay, layout.menu.x, layout.menu.y)).toBe(false);
    expect(containsScreenPoint(layout.menu, 20, 400)).toBe(false);
  });

  it('maps scaled browser touch and mouse positions to logical game coordinates', () => {
    const point = clientPointInGame(205, 393, {
      left: 10, top: 20, width: 195, height: 422,
    }, MOBILE_GAME_WIDTH, 844);
    expect(point).toEqual({ x: MOBILE_GAME_WIDTH, y: 746 });
    expect(clientPointInGame(10, 20, {
      left: 10, top: 20, width: 0, height: 422,
    }, MOBILE_GAME_WIDTH, 844)).toBeUndefined();
  });
});

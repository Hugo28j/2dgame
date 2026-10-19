import { describe, expect, it } from 'vitest';
import { DESKTOP_GAME_WIDTH, MOBILE_GAME_WIDTH, viewportWidthForScreen } from '../src/config/constants';
import { upgradeCardBounds } from '../src/ui/upgradeLayout';

describe('desktop width without shrinking mobile controls', () => {
  it('keeps portrait on phones and uses a larger canvas on desktop', () => {
    expect(viewportWidthForScreen(390, false)).toBe(MOBILE_GAME_WIDTH);
    expect(viewportWidthForScreen(900, false)).toBe(MOBILE_GAME_WIDTH);
    expect(viewportWidthForScreen(1199, true)).toBe(DESKTOP_GAME_WIDTH);
    expect(DESKTOP_GAME_WIDTH).toBeGreaterThan(MOBILE_GAME_WIDTH);
  });
});

describe('upgrade hit regions', () => {
  it('tracks the visible plate on all three cards at both screen sizes', () => {
    for (const width of [MOBILE_GAME_WIDTH, DESKTOP_GAME_WIDTH]) {
      const cards = Array.from({ length: 3 }, (_, i) => upgradeCardBounds(width, i));
      expect(cards.map(c => c.x)).toEqual([width / 2, width / 2, width / 2]);
      expect(cards.map(c => c.y)).toEqual([302, 414, 526]);
      for (const card of cards) {
        expect(card.x - card.width / 2).toBeGreaterThanOrEqual(0);
        expect(card.x + card.width / 2).toBeLessThanOrEqual(width);
      }
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i]!.y - cards[i - 1]!.y).toBeGreaterThan(cards[i]!.height);
      }
    }
  });
});

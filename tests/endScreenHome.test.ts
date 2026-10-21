import { describe, expect, it } from 'vitest';
import { homeButtonClientBounds, homeButtonLayout } from '../src/ui/homeButtonLayout';

describe('new end screen HOME button', () => {
  it('uses a single centered control within both portrait and desktop canvas', () => {
    for (const width of [390, 760]) {
      const bounds = homeButtonLayout(width);
      expect(bounds.x).toBe(width / 2);
      expect(bounds.width).toBeLessThan(width);
      expect(bounds.y + bounds.height / 2).toBeLessThan(844);
    }
  });

  it('follows mobile canvas offset and scale precisely', () => {
    const logical = homeButtonLayout(390);
    expect(homeButtonClientBounds(logical,
      { left: 35, top: 12, width: 195, height: 422 }, 390, 844,
    )).toEqual({ left: 55, top: 358.5, width: 155, height: 32 });
  });

  it('follows desktop canvas center, never the page center', () => {
    const logical = homeButtonLayout(760);
    const result = homeButtonClientBounds(logical,
      { left: 152, top: 26, width: 608, height: 675.2 }, 760, 844,
    );
    expect(result?.left).toBeCloseTo(332);
    expect(result?.top).toBeCloseTo(580.4);
    expect(result?.width).toBeCloseTo(248);
    expect(result?.height).toBeCloseTo(51.2);
  });

  it('does not produce an invalid hit area when canvas is hidden', () => {
    const logical = homeButtonLayout(390);
    expect(homeButtonClientBounds(logical,
      { left: 0, top: 0, width: 0, height: 0 }, 390, 844,
    )).toBeUndefined();
  });
});

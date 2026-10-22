import { describe, expect, it } from 'vitest';
import { getWorldCharacter } from '../src/enemies/worldCharacters';
import { getEnemyKindForRoom, getSlimeStatsForRoom } from '../src/enemies/enemyConfig';
import {
  goblinKnifeAngle, goblinKnifeSwingActive, goblinKnifeCanHit,
  GOBLIN_KNIFE_WINDUP_MS, GOBLIN_KNIFE_IMPACT_MS,
  GOBLIN_KNIFE_SLASH_END_MS, GOBLIN_KNIFE_TOTAL_MS,
  GOBLIN_KNIFE_HIT_RANGE,
} from '../src/enemies/goblinKnife';

describe('World 1 Goblin Scout', () => {
  it('is the opening World-1 mob, with its own named sprite only in that world', () => {
    for (const index of [0, 1, 2]) {
      expect(getEnemyKindForRoom(1, index, 1)).toBe('slime');
    }
    expect(getWorldCharacter(1, 'slime').name).toBe('Goblin Scout');
    expect(getWorldCharacter(1, 'slime').textureKey).toBe('world-1-slime');
    expect(getWorldCharacter(2, 'slime').name).toBe('Snow Puff');
    expect(getWorldCharacter(3, 'slime').name).toBe('Ash Crawler');
    expect(getWorldCharacter(4, 'slime').name).toBe('Spark Sprite');
    expect(getWorldCharacter(5, 'slime').name).toBe('Void Spawn');
  });

  it('first raises the knife, slashes at the impact frame, then returns to idle', () => {
    expect(GOBLIN_KNIFE_WINDUP_MS).toBeGreaterThan(0);
    expect(GOBLIN_KNIFE_IMPACT_MS).toBeGreaterThan(GOBLIN_KNIFE_WINDUP_MS);
    expect(GOBLIN_KNIFE_IMPACT_MS).toBeLessThan(GOBLIN_KNIFE_SLASH_END_MS);
    expect(GOBLIN_KNIFE_TOTAL_MS).toBeGreaterThan(GOBLIN_KNIFE_SLASH_END_MS);
    expect(GOBLIN_KNIFE_TOTAL_MS).toBeLessThan(getSlimeStatsForRoom(1, 1).attackIntervalMs);
    expect(goblinKnifeAngle(GOBLIN_KNIFE_WINDUP_MS))
      .toBeLessThan(goblinKnifeAngle(0));
    expect(goblinKnifeAngle(GOBLIN_KNIFE_IMPACT_MS))
      .toBeGreaterThan(goblinKnifeAngle(GOBLIN_KNIFE_WINDUP_MS));
    expect(goblinKnifeAngle(GOBLIN_KNIFE_SLASH_END_MS))
      .toBeGreaterThan(goblinKnifeAngle(GOBLIN_KNIFE_IMPACT_MS));
    expect(goblinKnifeAngle(GOBLIN_KNIFE_TOTAL_MS)).toBeCloseTo(goblinKnifeAngle(-1));
    expect(goblinKnifeSwingActive(GOBLIN_KNIFE_WINDUP_MS - 1)).toBe(false);
    expect(goblinKnifeSwingActive(GOBLIN_KNIFE_IMPACT_MS)).toBe(true);
    expect(goblinKnifeSwingActive(GOBLIN_KNIFE_SLASH_END_MS)).toBe(false);
  });

  it('only the nearby player can be struck: walking away avoids the delayed knife', () => {
    expect(goblinKnifeCanHit(0)).toBe(true);
    expect(goblinKnifeCanHit(GOBLIN_KNIFE_HIT_RANGE)).toBe(true);
    expect(goblinKnifeCanHit(GOBLIN_KNIFE_HIT_RANGE + 0.1)).toBe(false);
    expect(goblinKnifeCanHit(200)).toBe(false);
    expect(goblinKnifeCanHit(-1)).toBe(false);
    expect(goblinKnifeCanHit(NaN)).toBe(false);
  });
});

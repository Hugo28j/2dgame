import { HEROES, type HeroId } from '../heroes/heroConfig';

/** A separate roll for each incoming hit eligible for damage. */
export function shouldParryHit(heroId: HeroId, roll: number): boolean {
  const chance = HEROES[heroId].parryChance ?? 0;
  return Number.isFinite(roll) && roll >= 0 && roll < chance;
}

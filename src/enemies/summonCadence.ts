import { FROZEN_BALANCE } from './frozenBalance';
import { FROZEN_EARLY } from './frozenEarlyGame';

/** Summons are living enemies' ACTIVE abilities, never death-triggered splits.
 * Adding a new summoner here gives it the same quick first call and its own
 * usual repeat interval. */
export type SummonerType = 'frost-witch' | 'snow-sentinel';

/** First minions appear within the summoner's first second alive. */
export const FIRST_SUMMON_DELAY_MS = 350;

export function getSummonerType(
  worldId: number, kind: string, roomNumber: number, bossSlot: number,
): SummonerType | undefined {
  if (worldId !== 2) return undefined;
  if (kind === 'mage') return 'frost-witch';
  if (kind === 'boss' && roomNumber === 15 && bossSlot === 1)
    return 'snow-sentinel';
  // Normal ice giants split only ON DEATH, not on a timed summon.
  return undefined;
}

export function summonIntervalMs(type: SummonerType): number {
  return type === 'frost-witch'
    ? FROZEN_EARLY.witchSummonIntervalMs
    : FROZEN_BALANCE.sentinelSummonIntervalMs;
}

/** The first timer starts at creation; later timers start at the actual
 * summon attempt, so no cooldown is spent before the first minions arrive. */
export function firstSummonTime(createdAt: number, type: SummonerType | undefined): number {
  return type ? createdAt + FIRST_SUMMON_DELAY_MS : Number.POSITIVE_INFINITY;
}

export function nextSummonTime(summonedAt: number, type: SummonerType): number {
  return summonedAt + summonIntervalMs(type);
}

export function summonIsDue(now: number, nextAt: number): boolean {
  return Number.isFinite(now) && now >= nextAt;
}

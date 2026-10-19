/**
 * Health earned by *clearing* a room, never by entering it. The percent
 * grows every ten cleared chambers to support a 50-room campaign.
 *
 * - Base recovery: 6% of max HP, +1 percentage point per 10 rooms.
 * - Every third cleared room: +8 percentage points.
 * - Boss clear (every fifth): +14 percentage points.
 * - At most 30% in one clear; never exceed missing HP.
 *
 * Unlike a timed regen loop, this cannot be exploited by waiting in an empty
 * room or repeatedly touching the exit.
 */
export interface RoomHeal {
  amount: number;
  percent: number;
  milestone: boolean;
  boss: boolean;
}

export function roomClearHealing(
  clearedRoom: number, currentHp: number, maxHp: number,
): RoomHeal {
  const none: RoomHeal = { amount: 0, percent: 0, milestone: false, boss: false };
  if (!Number.isSafeInteger(clearedRoom) || clearedRoom < 1 ||
    !Number.isFinite(currentHp) || !Number.isFinite(maxHp) || maxHp <= 0 ||
    currentHp <= 0) return none;

  const milestone = clearedRoom % 3 === 0;
  const boss = clearedRoom % 5 === 0;
  const base = 0.06 + Math.min(4, Math.floor((clearedRoom - 1) / 10)) * 0.01;
  const percent = Math.min(0.30, base + (milestone ? 0.08 : 0) + (boss ? 0.14 : 0));
  const missingHp = Math.max(0, maxHp - currentHp);
  const amount = Math.min(missingHp, Math.ceil(maxHp * percent));
  return { amount, percent, milestone, boss };
}

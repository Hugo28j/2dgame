import { HERO_IDS, type HeroId } from '../heroes/heroConfig';
import { WEAPONS, type WeaponId } from '../weapons/weaponConfig';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import type { WorldId } from '../worlds/worldConfig';
import { RUN_UPGRADES, type RunUpgradeId } from './runUpgrades';
import type { RunLedgerSnapshot } from './RunLedger';

export const RUN_CHECKPOINT_KEY = 'dungeon-ascent-active-run-v1';

/** A room-entry checkpoint, not a mid-fight state: re-entering the room restarts
 * its fight and avoids duplicated coin drops and boss clear rewards. */
export interface RunCheckpoint {
  version: 1;
  savedAt: number;
  worldId: WorldId;
  room: number;
  heroId: HeroId;
  weaponId: WeaponId;
  health: number;
  shield: number;
  upgrades: RunUpgradeId[];
  ledger: RunLedgerSnapshot;
}

const validNonNegative = (n: unknown, max = 1_000_000_000): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;

export function validateRunCheckpoint(raw: unknown): RunCheckpoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<RunCheckpoint>;
  if (s.version !== 1 || !Number.isSafeInteger(s.room) ||
      s.room! < 1 || s.room! > CHAPTER_ROOM_COUNT ||
      !Number.isSafeInteger(s.worldId) || s.worldId! < 1 || s.worldId! > 5 ||
      !HERO_IDS.includes(s.heroId as HeroId) ||
      !s.weaponId || !Object.prototype.hasOwnProperty.call(WEAPONS, s.weaponId) ||
      WEAPONS[s.weaponId].heroId !== s.heroId ||
      !validNonNegative(s.savedAt, 1e15) ||
      !validNonNegative(s.health, 1e9) || s.health === 0 ||
      !validNonNegative(s.shield, 1e9) ||
      !Array.isArray(s.upgrades) || s.upgrades.length > 64 ||
      !s.upgrades.every(id => RUN_UPGRADES.some(u => u.id === id))) return null;
  const ledger = s.ledger as Partial<RunLedgerSnapshot> | undefined;
  if (!ledger || typeof ledger.runId !== 'string' || !ledger.runId ||
      ledger.runId.length > 100 || ledger.worldId !== s.worldId ||
      !Number.isSafeInteger(ledger.reachedRoom) ||
      ledger.reachedRoom !== s.room ||
      !Array.isArray(ledger.enemyIds) || ledger.enemyIds.length > 5000 ||
      !ledger.enemyIds.every(id => typeof id === 'string' && id.length <= 150) ||
      !Array.isArray(ledger.rooms) || ledger.rooms.length > CHAPTER_ROOM_COUNT ||
      !ledger.rooms.every(n => Number.isSafeInteger(n) && n > 0 && n < s.room!) ||
      !validNonNegative(ledger.bosses, 1000) ||
      !validNonNegative(ledger.damage) || !validNonNegative(ledger.gold)) return null;
  // No stale/corrupt save may grant already settled rewards from this run.
  return s as RunCheckpoint;
}

export class RunCheckpointStore {
  private memory: RunCheckpoint | null = null;
  public constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {}
  private store(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined {
    try { return this.storage ?? (typeof window === 'undefined' ? undefined : window.localStorage); }
    catch { return undefined; }
  }
  public load(): RunCheckpoint | null {
    try {
      const raw = this.store()?.getItem(RUN_CHECKPOINT_KEY);
      if (raw !== undefined && raw !== null) return validateRunCheckpoint(JSON.parse(raw));
    } catch { /* Storage might be unavailable or damaged. */ }
    return this.memory;
  }
  public save(checkpoint: RunCheckpoint): boolean {
    const valid = validateRunCheckpoint(checkpoint);
    if (!valid) return false;
    this.memory = valid;
    try { this.store()?.setItem(RUN_CHECKPOINT_KEY, JSON.stringify(valid)); }
    catch { /* In-memory fallback during this session. */ }
    return true;
  }
  public clear(): void {
    this.memory = null;
    try { this.store()?.removeItem(RUN_CHECKPOINT_KEY); }
    catch { /* No persistent storage permission. */ }
  }
}

export const runCheckpointStore = new RunCheckpointStore();

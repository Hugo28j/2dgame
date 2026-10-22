import type { WorldId } from '../worlds/worldConfig';
import type { EnemyKind } from '../enemies/enemyConfig';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';

export interface RunReport {
  worldId: WorldId;
  runId: string;
  reachedRoom: number;
  roomsCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  totalDamage: number;
  earnedGold: number;
  victory: boolean;
}

/** The checkpoint saves the ledger IDs, ensuring rewards can be settled only once. */
export interface RunLedgerSnapshot {
  runId: string;
  worldId: WorldId;
  reachedRoom: number;
  rooms: number[];
  enemyIds: string[];
  bosses: number;
  damage: number;
  gold: number;
}

/** Only physically collected coin gold is settled at death or victory. */
export class RunLedger {
  private readonly enemyIds = new Set<string>();
  private readonly rooms = new Set<number>();
  public readonly runId: string;
  private reached = 1;
  private bosses = 0;
  private damage = 0;
  private gold = 0;

  public constructor(id = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    public readonly worldId: WorldId = 1) {
    this.runId = id;
  }
  public enterRoom(room: number): void {
    if (Number.isSafeInteger(room) && room > this.reached) this.reached = Math.min(CHAPTER_ROOM_COUNT, room);
  }
  public defeatEnemy(enemyId: string, kind: EnemyKind): boolean {
    if (!enemyId || this.enemyIds.has(enemyId)) return false;
    this.enemyIds.add(enemyId);
    if (kind === 'boss') this.bosses += 1;
    return true;
  }
  public clearRoom(room: number): boolean {
    if (!Number.isSafeInteger(room) || room < 1 || room > CHAPTER_ROOM_COUNT || this.rooms.has(room)) return false;
    this.rooms.add(room);
    return true;
  }
  /** Invoked only when the player touches/magnetically collects a coin. */
  public collectGold(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount <= 0) return false;
    this.gold = Math.min(1_000_000_000, this.gold + amount);
    return true;
  }
  public recordDamage(amount: number): void {
    if (Number.isFinite(amount) && amount > 0) this.damage = Math.min(1e9, this.damage + amount);
  }
  public get runGold(): number { return this.gold; }
  public snapshot(): RunLedgerSnapshot {
    return {
      runId: this.runId, worldId: this.worldId, reachedRoom: this.reached,
      rooms: [...this.rooms], enemyIds: [...this.enemyIds],
      bosses: this.bosses, damage: this.damage, gold: this.gold,
    };
  }
  /** Rehydrate only from a validated checkpoint with the same run identity. */
  public restore(saved: RunLedgerSnapshot): void {
    if (saved.runId !== this.runId || saved.worldId !== this.worldId) return;
    this.reached = saved.reachedRoom;
    this.rooms.clear();
    for (const room of saved.rooms) this.rooms.add(room);
    this.enemyIds.clear();
    for (const id of saved.enemyIds) this.enemyIds.add(id);
    this.bosses = saved.bosses;
    this.damage = saved.damage;
    this.gold = saved.gold;
  }
  public report(victory: boolean): RunReport {
    return {
      runId: this.runId, worldId: this.worldId, reachedRoom: this.reached, roomsCleared: this.rooms.size,
      enemiesDefeated: this.enemyIds.size, bossesDefeated: this.bosses,
      totalDamage: Math.round(this.damage), earnedGold: this.gold, victory,
    };
  }
}

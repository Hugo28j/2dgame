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
  public report(victory: boolean): RunReport {
    return {
      runId: this.runId, worldId: this.worldId, reachedRoom: this.reached, roomsCleared: this.rooms.size,
      enemiesDefeated: this.enemyIds.size, bossesDefeated: this.bosses,
      totalDamage: Math.round(this.damage), earnedGold: this.gold, victory,
    };
  }
}

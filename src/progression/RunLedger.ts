import type { EnemyKind } from '../enemies/enemyConfig';

export interface RunReport {
  runId: string;
  reachedRoom: number;
  roomsCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  totalDamage: number;
  earnedGold: number;
  victory: boolean;
}

/** Run gold is provisional until settlement at death or chapter completion. */
export class RunLedger {
  private readonly enemyIds = new Set<string>();
  private readonly rooms = new Set<number>();
  public readonly runId: string;
  private reached = 1;
  private bosses = 0;
  private damage = 0;
  private gold = 0;

  public constructor(id = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2)) {
    this.runId = id;
  }
  public enterRoom(room: number): void {
    if (Number.isSafeInteger(room) && room > this.reached) this.reached = Math.min(20, room);
  }
  public defeatEnemy(enemyId: string, kind: EnemyKind): boolean {
    if (!enemyId || this.enemyIds.has(enemyId)) return false;
    this.enemyIds.add(enemyId);
    this.gold += kind === 'boss' ? 90 : kind === 'tank' ? 9 : 5;
    if (kind === 'boss') this.bosses += 1;
    return true;
  }
  public clearRoom(room: number): boolean {
    if (!Number.isSafeInteger(room) || room < 1 || room > 20 || this.rooms.has(room)) return false;
    this.rooms.add(room);
    this.gold += 20 + room * 3 + (room % 5 === 0 ? 70 : 0);
    return true;
  }
  public recordDamage(amount: number): void {
    if (Number.isFinite(amount) && amount > 0) this.damage = Math.min(1e9, this.damage + amount);
  }
  public get runGold(): number { return this.gold; }
  public report(victory: boolean): RunReport {
    return {
      runId: this.runId, reachedRoom: this.reached, roomsCleared: this.rooms.size,
      enemiesDefeated: this.enemyIds.size, bossesDefeated: this.bosses,
      totalDamage: Math.round(this.damage), earnedGold: this.gold, victory,
    };
  }
}

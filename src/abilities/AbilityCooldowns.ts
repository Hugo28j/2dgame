import type { AbilityId } from './abilityConfig';

/** Per-run, monotonic game-time cooldowns (pause and lost focus do not consume them). */
export class AbilityCooldowns {
  private readonly nextReadyAt = new Map<AbilityId, number>();
  private pausedAt: number | null = null;

  /** Stop recharge while a room is cleared; repeated pauses do not change the timestamp. */
  public pause(now: number): void {
    if (this.pausedAt === null && Number.isFinite(now)) this.pausedAt = now;
  }

  /** Shift every deadline by the paused period, preserving all remaining cooldowns. */
  public resume(now: number): void {
    if (this.pausedAt === null || !Number.isFinite(now)) return;
    const duration = Math.max(0, now - this.pausedAt);
    for (const [id, deadline] of this.nextReadyAt) {
      this.nextReadyAt.set(id, deadline + duration);
    }
    this.pausedAt = null;
  }

  private clock(now: number): number { return this.pausedAt ?? now; }

  public remainingMs(id: AbilityId, now: number): number {
    return Math.max(0, (this.nextReadyAt.get(id) ?? 0) - this.clock(now));
  }

  public ready(id: AbilityId, now: number): boolean {
    return this.remainingMs(id, now) <= 0;
  }

  public activate(id: AbilityId, now: number, cooldownMs: number, modifier: number): boolean {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(cooldownMs) || cooldownMs <= 0 ||
        !Number.isFinite(modifier) || modifier <= 0 || !this.ready(id, now)) return false;
    this.nextReadyAt.set(id, this.clock(now) + cooldownMs * modifier);
    return true;
  }

  /** Apply an acquired Focus upgrade to cooldowns that are already running. */
  public shortenRemaining(now: number, factor: number): void {
    if (!(factor > 0 && factor < 1)) return;
    const clock = this.clock(now);
    for (const [id, deadline] of this.nextReadyAt) {
      if (deadline > clock) this.nextReadyAt.set(id, clock + (deadline - clock) * factor);
    }
  }

  public clear(): void { this.nextReadyAt.clear(); this.pausedAt = null; }
}

import type { AbilityId } from './abilityConfig';

/** Per-run, monotonic game-time cooldowns (pause and lost focus do not consume them). */
export class AbilityCooldowns {
  private readonly nextReadyAt = new Map<AbilityId, number>();

  public remainingMs(id: AbilityId, now: number): number {
    return Math.max(0, (this.nextReadyAt.get(id) ?? 0) - now);
  }

  public ready(id: AbilityId, now: number): boolean {
    return this.remainingMs(id, now) <= 0;
  }

  public activate(id: AbilityId, now: number, cooldownMs: number, modifier: number): boolean {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(cooldownMs) || cooldownMs <= 0 ||
        !Number.isFinite(modifier) || modifier <= 0 || !this.ready(id, now)) return false;
    this.nextReadyAt.set(id, now + cooldownMs * modifier);
    return true;
  }

  public clear(): void { this.nextReadyAt.clear(); }
}

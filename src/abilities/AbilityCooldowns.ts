import { ABILITIES, ABILITY_SLOTS, type AbilityId } from './abilityConfig';

/** Per-run, monotonic game-time cooldowns (pause and lost focus do not consume them). */
export class AbilityCooldowns {
  private readonly nextReadyAt: Record<AbilityId, number> = {
    dash: 0, 'fire-nova': 0, 'ice-blast': 0,
  };

  public remainingMs(id: AbilityId, now: number): number {
    return Math.max(0, this.nextReadyAt[id] - now);
  }

  public ready(id: AbilityId, now: number): boolean {
    return ABILITIES[id].available && this.remainingMs(id, now) <= 0;
  }

  /** Return false without spending cooldown when an ability cannot be cast. */
  public activate(id: AbilityId, now: number, modifier: number): boolean {
    if (!Number.isFinite(now) || now < 0 || !Number.isFinite(modifier) ||
        modifier <= 0 || !this.ready(id, now)) return false;
    this.nextReadyAt[id] = now + ABILITIES[id].cooldownMs * modifier;
    return true;
  }

  public clear(): void {
    for (const id of ABILITY_SLOTS) this.nextReadyAt[id] = 0;
  }
}

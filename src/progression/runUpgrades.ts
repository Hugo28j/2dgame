export type RunUpgradeId =
  | 'damage' | 'attackSpeed' | 'movement' | 'maxHp' | 'healing'
  | 'projectile' | 'piercing' | 'crit' | 'defense' | 'cooldown';
export type UpgradeRarity = 'common' | 'rare' | 'epic';
export interface RunUpgrade {
  id: RunUpgradeId;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  maxStacks: number;
}
export const RUN_UPGRADES: readonly RunUpgrade[] = [
  { id: 'damage', name: 'Scherpe Slagen', description: '+15% schade', rarity: 'common', maxStacks: 4 },
  { id: 'attackSpeed', name: 'Snelle Handen', description: '+10% aanvalssnelheid', rarity: 'common', maxStacks: 4 },
  { id: 'movement', name: 'Lichte Voeten', description: '+12% loopsnelheid', rarity: 'common', maxStacks: 3 },
  { id: 'maxHp', name: 'Levenskracht', description: '+20 max HP (ook herstellen)', rarity: 'rare', maxStacks: 3 },
  { id: 'healing', name: 'Herstel', description: 'Herstel 35 HP', rarity: 'common', maxStacks: 4 },
  { id: 'projectile', name: 'Dubbel Schot', description: '+1 projectiel per aanval', rarity: 'epic', maxStacks: 1 },
  { id: 'piercing', name: 'Doorboring', description: '+1 doorboring per projectiel', rarity: 'rare', maxStacks: 2 },
  { id: 'crit', name: 'Precisie', description: '+6% kritieke kans', rarity: 'rare', maxStacks: 3 },
  { id: 'defense', name: 'Pantser', description: '+15% verdediging', rarity: 'common', maxStacks: 4 },
  { id: 'cooldown', name: 'Focus', description: '-10% ability cooldown', rarity: 'rare', maxStacks: 3 },
] as const;

/** In-memory deck: no upgrade survives a new run; max stacks are enforced. */
export class RunUpgradeDeck {
  private readonly stacks = new Map<RunUpgradeId, number>();
  public constructor(private readonly random: () => number = Math.random) {}
  public count(id: RunUpgradeId): number { return this.stacks.get(id) ?? 0; }
  public offer(allowHealing = true): RunUpgrade[] {
    const pool = RUN_UPGRADES.filter(upgrade =>
      this.count(upgrade.id) < upgrade.maxStacks && (allowHealing || upgrade.id !== 'healing'));
    // Fisher-Yates avoids repeated cards, biased sorts and unbounded retries.
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.min(i, Math.max(0, Math.floor(this.random() * (i + 1))));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, 3);
  }
  public choose(id: RunUpgradeId): boolean {
    const upgrade = RUN_UPGRADES.find(item => item.id === id);
    if (!upgrade || this.count(id) >= upgrade.maxStacks) return false;
    this.stacks.set(id, this.count(id) + 1);
    return true;
  }
  public chosen(): { name: string; stacks: number }[] {
    return RUN_UPGRADES.filter(item => this.count(item.id) > 0)
      .map(item => ({ name: item.name, stacks: this.count(item.id) }));
  }
}

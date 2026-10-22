export type RunUpgradeId =
  | 'damage' | 'attackSpeed' | 'movement' | 'maxHp' | 'healing'
  | 'projectile' | 'piercing' | 'meleeRange' | 'meleeStun' | 'crit' | 'defense' | 'cooldown';
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
  { id: 'meleeRange', name: 'Verlengde Slag', description: '+20% melee-bereik', rarity: 'rare', maxStacks: 3 },
  { id: 'meleeStun', name: 'Verdovende Slagen', description: 'Elke melee-hit verdooft 0,5 seconde', rarity: 'epic', maxStacks: 1 },
  { id: 'crit', name: 'Precisie', description: '+6% kritieke kans', rarity: 'rare', maxStacks: 3 },
  { id: 'defense', name: 'Pantser', description: '+15% verdediging', rarity: 'common', maxStacks: 4 },
  { id: 'cooldown', name: 'Focus', description: '-10% ability cooldown', rarity: 'rare', maxStacks: 3 },
] as const;

/** In-memory deck: no upgrade survives a new run; max stacks are enforced. */
export class RunUpgradeDeck {
  private readonly stacks = new Map<RunUpgradeId, number>();
  private readonly history: RunUpgradeId[] = [];
  public constructor(private readonly random: () => number = Math.random) {}
  public count(id: RunUpgradeId): number { return this.stacks.get(id) ?? 0; }
  public offer(allowHealing = true, attackMode: 'melee' | 'projectile' = 'projectile'): RunUpgrade[] {
    const pool = RUN_UPGRADES.filter(upgrade =>
      this.count(upgrade.id) < upgrade.maxStacks &&
      (allowHealing || upgrade.id !== 'healing') &&
      (attackMode === 'melee'
        ? upgrade.id !== 'projectile' && upgrade.id !== 'piercing'
        : upgrade.id !== 'meleeRange' && upgrade.id !== 'meleeStun'));
    // Weighted sampling without replacement: common 75%, rare 20%, epic 5%
    // when each tier is represented by one eligible card.
    const weights = { common: 15, rare: 4, epic: 1 } as const;
    const options: RunUpgrade[] = [];
    while (options.length < 3 && pool.length > 0) {
      const total = pool.reduce((sum, upgrade) => sum + weights[upgrade.rarity], 0);
      let roll = Math.min(0.999999999, Math.max(0, this.random())) * total;
      let chosen = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        roll -= weights[pool[i]!.rarity];
        if (roll < 0) { chosen = i; break; }
      }
      options.push(pool.splice(chosen, 1)[0]!);
    }
    return options;
  }
  public choose(id: RunUpgradeId): boolean {
    const upgrade = RUN_UPGRADES.find(item => item.id === id);
    if (!upgrade || this.count(id) >= upgrade.maxStacks) return false;
    this.stacks.set(id, this.count(id) + 1);
    this.history.push(id);
    return true;
  }
  public snapshot(): RunUpgradeId[] { return [...this.history]; }
  public restore(chosen: readonly RunUpgradeId[]): void {
    this.stacks.clear();
    this.history.length = 0;
    for (const id of chosen) this.choose(id);
  }
  public chosen(): { name: string; stacks: number }[] {
    return RUN_UPGRADES.filter(item => this.count(item.id) > 0)
      .map(item => ({ name: item.name, stacks: this.count(item.id) }));
  }
}

export interface AttackData {
  damage: number;
  criticalChance: number;
  criticalMultiplier: number;
}

export interface Damageable {
  readonly defense: number;
  receiveDamage(amount: number): boolean;
}

export interface DamageResult {
  amount: number;
  critical: boolean;
  defeated: boolean;
}

export const calculateDamage = (
  attack: Readonly<AttackData>,
  defense: number,
  criticalRoll: number,
): Omit<DamageResult, 'defeated'> => {
  const criticalChance = Math.min(1, Math.max(0, attack.criticalChance));
  const critical = criticalRoll < criticalChance;
  const criticalDamage = critical ? attack.damage * attack.criticalMultiplier : attack.damage;
  const mitigation = 100 / (100 + Math.max(0, defense));

  return {
    amount: Math.max(1, Math.round(criticalDamage * mitigation)),
    critical,
  };
};

export class DamageSystem {
  public apply(
    target: Damageable,
    attack: Readonly<AttackData>,
    criticalRoll = Math.random(),
  ): DamageResult {
    const result = calculateDamage(attack, target.defense, criticalRoll);

    return {
      ...result,
      defeated: target.receiveDamage(result.amount),
    };
  }
}

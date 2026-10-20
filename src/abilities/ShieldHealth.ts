/** Shield HP is a separate layer. Recasting refreshes it instead of stacking. */
export const SHIELD_MAX_HP = 50;

export function absorbWithShield(health: number, shield: number, incoming: number):
  { health: number; shield: number; defeated: boolean } {
  const damage = Number.isFinite(incoming) ? Math.max(0, incoming) : 0;
  const absorbed = Math.min(Math.max(0, shield), damage);
  const nextHealth = Math.max(0, health - (damage - absorbed));
  return { health: nextHealth, shield: Math.max(0, shield - absorbed),
    defeated: nextHealth === 0 };
}

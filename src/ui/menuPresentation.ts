import { HERO_WEAPONS, type WeaponId } from '../weapons/weaponConfig';
import type { HeroId } from '../heroes/heroConfig';
import type { AbilityStats } from '../abilities/abilityConfig';

/** Only show upgrades relevant to the current loadout; other heroes remain
 * upgradeable by selecting them first. All saved levels remain intact.
 */
export function equipmentForHero(heroId: HeroId): { heroId: HeroId; weaponIds: readonly WeaponId[] } {
  return { heroId, weaponIds: HERO_WEAPONS[heroId] };
}

/** Human-readable gameplay metrics. Unlike the former generic "0 DMG R0",
 * supports utility abilities such as Shield Bubble and Arcane Blink.
 */
export function abilityMenuSummary(stats: Readonly<AbilityStats>): string {
  const cooldown = (stats.cooldownMs / 1000).toFixed(1) + 'S CD';
  switch (stats.kind) {
    case 'shield': return '50 SHIELD HP  ·  ' + cooldown;
    case 'teleport': return 'TELEPORT 170  ·  ' + cooldown;
    case 'dash': return 'DASH ' + stats.dashSpeed + '  ·  ' + cooldown;
    case 'heal': return '+' + stats.heal + ' HP  ·  ' + cooldown;
    case 'timewarp': return (stats.durationMs / 1000).toFixed(1) + 'S SLOW MOTION  ·  ' + cooldown;
    case 'rapidFire': return stats.attackSpeedMultiplier.toFixed(2) +
      '× AANVALSSNELHEID · ' + (stats.durationMs / 1000).toFixed(1) +
      'S DUUR · ' + cooldown;
    case 'sprint': return '1.65× LOOPSNELHEID  ·  ' + cooldown;
    case 'companion': return 'AI BONDGENOOT  ·  ' + cooldown;
    case 'slow': return stats.damage + ' DMG  ·  ' +
      Math.round((1 - stats.slowFactor) * 100) + '% SLOW';
    case 'drain': return stats.damage + ' DMG  ·  +' + stats.heal + ' HP';
    case 'wind': return stats.damage + ' DMG  ·  KNOCKBACK  ·  ' + cooldown;
    case 'bomb': return stats.damage + ' DMG  ·  EXPLOSIE  ·  ' + cooldown;
    case 'shotgun': return stats.damage + ' DMG  ·  SALVO  ·  ' + cooldown;
    default: return stats.damage + ' DMG  ·  ' + cooldown;
  }
}

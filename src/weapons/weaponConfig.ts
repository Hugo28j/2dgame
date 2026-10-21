import { HEROES, type HeroId } from '../heroes/heroConfig';

export type WeaponId =
  | 'bow' | 'crossbow' | 'staff' | 'spellbook' | 'sunblade' | 'warhammer'
  | 'daggers' | 'iceblade' | 'emberstaff' | 'fireorbs' | 'lightning'
  | 'stormlance' | 'voidorb' | 'shadowscythe';
export type WeaponEffect = 'none' | 'magic' | 'chain-lightning';
export type AttackMode = 'projectile' | 'melee';

export interface WeaponConfig {
  id: WeaponId; heroId: HeroId; name: string; description: string;
  damage: number; fireRate: number; projectileSpeed: number; projectileCount: number;
  piercing: number; criticalChanceModifier: number; criticalMultiplier: number;
  specialEffects: readonly string[]; upgradeLevel: number; unlockCost: number;
  projectileRange: number; effect: WeaponEffect; textureKey: string;
  attackMode: AttackMode; meleeRange: number; meleeArc: number; color: number;
}

const projectile = (config: Omit<WeaponConfig, 'attackMode' | 'meleeRange' | 'meleeArc'>): WeaponConfig => ({
  ...config, attackMode: 'projectile', meleeRange: 0, meleeArc: 0,
});
const melee = (config: Omit<WeaponConfig, 'attackMode' | 'projectileSpeed' | 'projectileRange'> & {
  meleeRange: number; meleeArc: number;
}): WeaponConfig => ({ ...config, attackMode: 'melee', projectileSpeed: 0, projectileRange: 0 });

export const WEAPONS: Readonly<Record<WeaponId, WeaponConfig>> = {
  bow: projectile({ id: 'bow', heroId: 'ranger', name: 'Ascent Bow', description: 'Snelle, precieze pijlen',
    damage: 12, fireRate: 3.5, projectileSpeed: 470, projectileCount: 1, piercing: 0,
    criticalChanceModifier: 0.05, criticalMultiplier: 1.75, specialEffects: [], upgradeLevel: 1,
    unlockCost: 0, projectileRange: 700, effect: 'none', textureKey: 'arrow-placeholder', color: 0x7dd3fc }),
  crossbow: projectile({ id: 'crossbow', heroId: 'ranger', name: 'Hunter Crossbow', description: 'Traag, krachtig en doorborend',
    damage: 46, fireRate: 1.45, projectileSpeed: 590, projectileCount: 1, piercing: 1,
    criticalChanceModifier: 0.03, criticalMultiplier: 1.9, specialEffects: ['pierce'], upgradeLevel: 1,
    unlockCost: 110, projectileRange: 760, effect: 'none', textureKey: 'bolt-projectile', color: 0xfca5a5 }),
  staff: projectile({ id: 'staff', heroId: 'mage', name: 'Arcane Staff', description: 'Gebalanceerde magische bollen',
    damage: 31, fireRate: 2.5, projectileSpeed: 360, projectileCount: 1, piercing: 0,
    criticalChanceModifier: 0.04, criticalMultiplier: 1.8, specialEffects: ['magic'], upgradeLevel: 1,
    unlockCost: 0, projectileRange: 680, effect: 'magic', textureKey: 'magic-projectile', color: 0xc084fc }),
  spellbook: projectile({ id: 'spellbook', heroId: 'mage', name: 'Rune Tome', description: 'Eén magische runebol met lichte aim assist en één ricochet naar een tweede vijand',
    damage: 19, fireRate: 2.2, projectileSpeed: 390, projectileCount: 1, piercing: 0,
    criticalChanceModifier: 0.06, criticalMultiplier: 1.8, specialEffects: ['magic', 'ricochet'], upgradeLevel: 1,
    unlockCost: 145, projectileRange: 650, effect: 'magic', textureKey: 'rune-projectile', color: 0xe9d5ff }),
  sunblade: melee({ id: 'sunblade', heroId: 'guardian', name: 'Dawnblade', description: 'Snelle whoosh met extra bereik en knockback',
    damage: 42, fireRate: 1.75, projectileCount: 1, piercing: 0, criticalChanceModifier: 0.02,
    criticalMultiplier: 1.7, specialEffects: ['melee', 'knockback'], upgradeLevel: 1, unlockCost: 0,
    effect: 'none', textureKey: 'sun-slash', meleeRange: 96, meleeArc: 1.75, color: 0xfbbf24 }),
  warhammer: melee({ id: 'warhammer', heroId: 'guardian', name: 'Bulwark Hammer',
    description: 'Zware, trage grondslag: grote rechthoek die vijanden beschadigt en vertraagt',
    damage: 125, fireRate: 0.42, projectileCount: 1, piercing: 0, criticalChanceModifier: 0,
    criticalMultiplier: 1.65, specialEffects: ['melee', 'ground-crack', 'slow'], upgradeLevel: 1, unlockCost: 160,
    effect: 'none', textureKey: 'hammer-swing', meleeRange: 260, meleeArc: 0, color: 0xfde68a }),
  daggers: projectile({ id: 'daggers', heroId: 'frostblade', name: 'Ice Daggers', description: 'Twee snelle ijsspiezen met groter vliegbereik',
    damage: 14, fireRate: 5.1, projectileSpeed: 550, projectileCount: 2, piercing: 0,
    criticalChanceModifier: 0.09, criticalMultiplier: 1.75, specialEffects: ['spread'], upgradeLevel: 1,
    unlockCost: 135, projectileRange: 365, effect: 'none', textureKey: 'dagger-projectile', color: 0xe0f2fe }),
  iceblade: melee({ id: 'iceblade', heroId: 'frostblade', name: 'Glacial Blade', description: 'Snelle ijzige melee-combo',
    damage: 33, fireRate: 2.7, projectileCount: 1, piercing: 0, criticalChanceModifier: 0.1,
    criticalMultiplier: 2, specialEffects: ['melee'], upgradeLevel: 1, unlockCost: 0,
    effect: 'none', textureKey: 'ice-slash', meleeRange: 72, meleeArc: 1.35, color: 0x7dd3fc }),
  emberstaff: projectile({ id: 'emberstaff', heroId: 'pyromancer', name: 'Ember Staff', description: 'Zware vuurbollen met veel schade',
    damage: 39, fireRate: 1.9, projectileSpeed: 345, projectileCount: 1, piercing: 0,
    criticalChanceModifier: 0.03, criticalMultiplier: 1.85, specialEffects: ['magic'], upgradeLevel: 1,
    unlockCost: 0, projectileRange: 620, effect: 'magic', textureKey: 'ember-projectile', color: 0xfb923c }),
  fireorbs: projectile({ id: 'fireorbs', heroId: 'pyromancer', name: 'Phoenix Orbs', description: 'Drie vurige projectielen in een waaier',
    damage: 18, fireRate: 1.7, projectileSpeed: 390, projectileCount: 3, piercing: 0,
    criticalChanceModifier: 0.04, criticalMultiplier: 1.8, specialEffects: ['magic', 'spread'], upgradeLevel: 1,
    unlockCost: 190, projectileRange: 600, effect: 'magic', textureKey: 'fire-projectile', color: 0xfdba74 }),
  lightning: projectile({ id: 'lightning', heroId: 'stormstrider', name: 'Storm Wand', description: 'Bliksem springt naar extra vijanden',
    damage: 27, fireRate: 2.2, projectileSpeed: 440, projectileCount: 1, piercing: 0,
    criticalChanceModifier: 0.04, criticalMultiplier: 1.8, specialEffects: ['chain-lightning'], upgradeLevel: 1,
    unlockCost: 0, projectileRange: 680, effect: 'chain-lightning', textureKey: 'lightning-projectile', color: 0x67e8f9 }),
  stormlance: melee({ id: 'stormlance', heroId: 'stormstrider', name: 'Tempest Spear', description: 'Lange, smalle bliksemsteek',
    damage: 48, fireRate: 2.05, projectileCount: 1, piercing: 0, criticalChanceModifier: 0.06,
    criticalMultiplier: 1.9, specialEffects: ['melee'], upgradeLevel: 1, unlockCost: 220,
    effect: 'none', textureKey: 'storm-slash', meleeRange: 105, meleeArc: 0.72, color: 0xfde047 }),
  voidorb: projectile({ id: 'voidorb', heroId: 'voidwalker', name: 'Abyss Orb', description: 'Trage bol met hoge kritieke schade',
    damage: 48, fireRate: 1.55, projectileSpeed: 300, projectileCount: 1, piercing: 1,
    criticalChanceModifier: 0.1, criticalMultiplier: 2.15, specialEffects: ['magic', 'pierce'], upgradeLevel: 1,
    unlockCost: 0, projectileRange: 650, effect: 'magic', textureKey: 'void-projectile', color: 0xc084fc }),
  shadowscythe: melee({ id: 'shadowscythe', heroId: 'voidwalker', name: 'Shadow Scythe', description: 'Grote sikkel door een brede boog',
    damage: 62, fireRate: 1.2, projectileCount: 1, piercing: 0, criticalChanceModifier: 0.12,
    criticalMultiplier: 2.2, specialEffects: ['melee', 'wide-swing'], upgradeLevel: 1, unlockCost: 260,
    effect: 'none', textureKey: 'void-slash', meleeRange: 96, meleeArc: 2.8, color: 0xd8b4fe }),
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const SECOND_WEAPON_UNLOCK_LEVEL = 10;
export const BOW_CONFIG = WEAPONS.bow;
export const HERO_WEAPONS: Readonly<Record<HeroId, readonly WeaponId[]>> = {
  ranger: ['bow', 'crossbow'], mage: ['staff', 'spellbook'], guardian: ['sunblade', 'warhammer'],
  frostblade: ['iceblade', 'daggers'], pyromancer: ['emberstaff', 'fireorbs'],
  stormstrider: ['lightning', 'stormlance'], voidwalker: ['voidorb', 'shadowscythe'],
};
export const HERO_STARTER_WEAPON: Readonly<Record<HeroId, WeaponId>> = {
  ranger: 'bow', mage: 'staff', guardian: 'sunblade', frostblade: 'iceblade',
  pyromancer: 'emberstaff', stormstrider: 'lightning', voidwalker: 'voidorb',
};
/** The signature weapon is available immediately, the alternate at hero level 10. */
export function isWeaponUnlockedForHero(weaponId: WeaponId, heroId: HeroId, heroLevel: number): boolean {
  const weapons = HERO_WEAPONS[heroId];
  return weaponId === weapons[0] || (weaponId === weapons[1] && heroLevel >= SECOND_WEAPON_UNLOCK_LEVEL);
}
export function weaponBelongsToHero(weaponId: WeaponId, heroId: HeroId): boolean {
  return WEAPONS[weaponId].heroId === heroId;
}

/** The hammer uses the same forward rectangle geometry as Guardian's Wind Burst,
 * but hits harder and inflicts slow instead of the ability's knockback.
 */
export const WARHAMMER_GROUND_SLAM = Object.freeze({
  halfWidth: 85,
  slowDurationMs: 2400,
  slowFactor: 0.43,
  crackAnimationMs: 650,
});

export const MAX_WEAPON_LEVEL = 20;
/** Guardian's existing weapon damage at every level gets a flat 50% buff.
 * Not 50% compounded per upgrade — level scaling remains its normal +12%. */
export const GUARDIAN_WEAPON_DAMAGE_MULTIPLIER = 1.5;
/** Normal Guardian attack interval at maximum Bulwark Hammer upgrade level,
 * before run-specific attack speed bonuses / armor bonuses. */
export const WARHAMMER_MAX_ATTACK_INTERVAL_MS = 1500;

/** Base hero attack-speed stat is also applied by WeaponController. This
 * reflects the actual no-buffs timing players experience in combat. */
export function weaponBaseAttackIntervalMs(
  config: Pick<WeaponConfig, 'fireRate' | 'heroId'>,
): number {
  return fireIntervalMs(config.fireRate * HEROES[config.heroId].stats.attackSpeed);
}
export function weaponUpgradeCost(level: number): number {
  return 30 + Math.max(0, level - 1) * 25;
}
export function fireIntervalMs(fireRate: number): number {
  if (fireRate <= 0) throw new Error('Fire rate must be greater than zero.');
  return 1000 / fireRate;
}
export function getWeaponStats(id: WeaponId, level: number): WeaponConfig {
  const base = WEAPONS[id];
  const extra = Math.max(0, Math.min(MAX_WEAPON_LEVEL, Math.floor(level)) - 1);
  // Keep the hammer's original base attack rate and gradually shorten
  // its interval so a level-20 Guardian attacks once every exactly 1.5 s.
  // Do not round its effective fireRate: rounding to 2 decimals would
  // noticeably alter the resulting in-game attack interval.
  const maxHammerFireRate = 1000 /
    (WARHAMMER_MAX_ATTACK_INTERVAL_MS * HEROES.guardian.stats.attackSpeed);
  const fireRate = id === 'warhammer'
    ? base.fireRate + (maxHammerFireRate - base.fireRate) *
        (extra / (MAX_WEAPON_LEVEL - 1))
    : Math.round(base.fireRate * (1 + 0.02 * extra) * 100) / 100;
  const guardianDamage = base.heroId === 'guardian'
    ? GUARDIAN_WEAPON_DAMAGE_MULTIPLIER : 1;
  return { ...base, upgradeLevel: extra + 1,
    damage: Math.round(base.damage * (1 + 0.12 * extra) * guardianDamage * 10) / 10,
    fireRate };
}

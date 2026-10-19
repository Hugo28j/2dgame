import {
  HERO_IDS, HEROES, MAX_HERO_LEVEL, heroUpgradeCost, type HeroId,
} from '../heroes/heroConfig';
import {
  MAX_WEAPON_LEVEL, WEAPON_IDS, WEAPONS, weaponUpgradeCost, type WeaponId,
} from '../weapons/weaponConfig';

const STORAGE_KEY = 'dungeon-ascent:profile:v1';
export interface Profile {
  version: 1;
  gold: number;
  selectedHero: HeroId;
  selectedWeapon: WeaponId;
  unlockedHeroes: HeroId[];
  unlockedWeapons: WeaponId[];
  heroLevels: Record<HeroId, number>;
  weaponLevels: Record<WeaponId, number>;
}
export function defaultProfile(): Profile {
  return {
    version: 1, gold: 150, selectedHero: 'ranger', selectedWeapon: 'bow',
    unlockedHeroes: ['ranger'], unlockedWeapons: ['bow'],
    heroLevels: { ranger: 1, mage: 1, guardian: 1 },
    weaponLevels: { bow: 1, crossbow: 1, staff: 1, daggers: 1, lightning: 1 },
  };
}
const validLevel = (n: unknown, max: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(1, Math.floor(n))) : 1;
export function validateProfile(raw: unknown): Profile {
  const defaults = defaultProfile();
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) {
    return defaults;
  }
  const profile = raw as Partial<Profile>;
  const heroes = Array.isArray(profile.unlockedHeroes)
    ? HERO_IDS.filter(id => id === 'ranger' || profile.unlockedHeroes?.includes(id)) : ['ranger' as HeroId];
  const weapons = Array.isArray(profile.unlockedWeapons)
    ? WEAPON_IDS.filter(id => id === 'bow' || profile.unlockedWeapons?.includes(id)) : ['bow' as WeaponId];
  const heroLevels = { ...defaults.heroLevels };
  const weaponLevels = { ...defaults.weaponLevels };
  for (const id of HERO_IDS) heroLevels[id] = validLevel(profile.heroLevels?.[id], MAX_HERO_LEVEL);
  for (const id of WEAPON_IDS) weaponLevels[id] = validLevel(profile.weaponLevels?.[id], MAX_WEAPON_LEVEL);
  const selectedHero = heroes.includes(profile.selectedHero as HeroId)
    ? profile.selectedHero as HeroId : 'ranger';
  const selectedWeapon = weapons.includes(profile.selectedWeapon as WeaponId)
    ? profile.selectedWeapon as WeaponId : 'bow';
  return {
    version: 1,
    gold: typeof profile.gold === 'number' && Number.isFinite(profile.gold)
      ? Math.min(1_000_000_000, Math.max(0, Math.floor(profile.gold))) : 0,
    selectedHero, selectedWeapon, unlockedHeroes: heroes, unlockedWeapons: weapons,
    heroLevels, weaponLevels,
  };
}
export type ProfileAction =
  | { type: 'selectHero'; id: HeroId }
  | { type: 'selectWeapon'; id: WeaponId }
  | { type: 'unlockHero'; id: HeroId }
  | { type: 'unlockWeapon'; id: WeaponId }
  | { type: 'upgradeHero'; id: HeroId }
  | { type: 'upgradeWeapon'; id: WeaponId }
  | { type: 'awardGold'; amount: number };
export function applyProfileAction(profile: Profile, action: ProfileAction): Profile {
  const p = validateProfile(profile);
  switch (action.type) {
    case 'selectHero':
      return p.unlockedHeroes.includes(action.id) ? { ...p, selectedHero: action.id } : p;
    case 'selectWeapon':
      return p.unlockedWeapons.includes(action.id) ? { ...p, selectedWeapon: action.id } : p;
    case 'unlockHero': {
      const cost = HEROES[action.id].unlockCost;
      if (p.unlockedHeroes.includes(action.id) || p.gold < cost) return p;
      return { ...p, gold: p.gold - cost, unlockedHeroes: [...p.unlockedHeroes, action.id], selectedHero: action.id };
    }
    case 'unlockWeapon': {
      const cost = WEAPONS[action.id].unlockCost;
      if (p.unlockedWeapons.includes(action.id) || p.gold < cost) return p;
      return { ...p, gold: p.gold - cost, unlockedWeapons: [...p.unlockedWeapons, action.id], selectedWeapon: action.id };
    }
    case 'upgradeHero': {
      if (!p.unlockedHeroes.includes(action.id)) return p;
      const level = p.heroLevels[action.id];
      const cost = heroUpgradeCost(level);
      if (level >= MAX_HERO_LEVEL || p.gold < cost) return p;
      return { ...p, gold: p.gold - cost, heroLevels: { ...p.heroLevels, [action.id]: level + 1 } };
    }
    case 'upgradeWeapon': {
      if (!p.unlockedWeapons.includes(action.id)) return p;
      const level = p.weaponLevels[action.id];
      const cost = weaponUpgradeCost(level);
      if (level >= MAX_WEAPON_LEVEL || p.gold < cost) return p;
      return { ...p, gold: p.gold - cost, weaponLevels: { ...p.weaponLevels, [action.id]: level + 1 } };
    }
    case 'awardGold':
      return {
        ...p,
        gold: Math.min(1_000_000_000,
          p.gold + (Number.isFinite(action.amount) ? Math.max(0, Math.floor(action.amount)) : 0)),
      };
  }
}
export class ProgressStore {
  private profile: Profile;
  public constructor() {
    let loaded: unknown;
    try { loaded = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'); }
    catch { loaded = null; }
    this.profile = validateProfile(loaded);
  }
  public get current(): Readonly<Profile> { return this.profile; }
  public dispatch(action: ProfileAction): boolean {
    const next = applyProfileAction(this.profile, action);
    if (next === this.profile) return false;
    // Denied purchases return a normalized but unchanged profile.
    if (JSON.stringify(next) === JSON.stringify(this.profile)) return false;
    this.profile = next;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile)); }
    catch { /* Storage can be unavailable in private mode. Keep session state. */ }
    return true;
  }
}
export const progressStore = new ProgressStore();

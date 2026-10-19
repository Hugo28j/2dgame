import { HERO_IDS, HEROES, MAX_HERO_LEVEL, heroUpgradeCost, type HeroId } from '../heroes/heroConfig';
import { MAX_WEAPON_LEVEL, WEAPON_IDS, WEAPONS, weaponUpgradeCost, type WeaponId } from '../weapons/weaponConfig';
import {
  defaultPermanentLevels, MAX_PERMANENT_LEVEL, PERMANENT_UPGRADE_IDS,
  permanentUpgradeCost, type PermanentLevels, type PermanentUpgradeId,
} from './economy';
import type { RunReport } from './RunLedger';

const STORAGE_KEY = 'dungeon-ascent:profile:v2';
const LEGACY_KEY = 'dungeon-ascent:profile:v1';
const MAX_GOLD = 1_000_000_000;
const MAX_SETTLED_RUNS = 64;

export interface Profile {
  version: 2;
  gold: number;
  selectedHero: HeroId;
  selectedWeapon: WeaponId;
  unlockedHeroes: HeroId[];
  unlockedWeapons: WeaponId[];
  heroLevels: Record<HeroId, number>;
  weaponLevels: Record<WeaponId, number>;
  permanentLevels: PermanentLevels;
  highestRoom: number;
  settledRunIds: string[];
  settings: { musicEnabled: boolean; sfxEnabled: boolean };
}
export function defaultProfile(): Profile {
  return {
    version: 2, gold: 150, selectedHero: 'ranger', selectedWeapon: 'bow',
    unlockedHeroes: ['ranger'], unlockedWeapons: ['bow'],
    heroLevels: { ranger: 1, mage: 1, guardian: 1 },
    weaponLevels: { bow: 1, crossbow: 1, staff: 1, daggers: 1, lightning: 1 },
    permanentLevels: defaultPermanentLevels(), highestRoom: 1,
    settledRunIds: [], settings: { musicEnabled: true, sfxEnabled: true },
  };
}
const validLevel = (n: unknown, min: number, max: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : min;

export function validateProfile(raw: unknown): Profile {
  const defaults = defaultProfile();
  if (!raw || typeof raw !== 'object' ||
    ![1, 2].includes((raw as { version?: number }).version ?? -1)) return defaults;
  const input = raw as Partial<Profile>;
  const heroes = Array.isArray(input.unlockedHeroes)
    ? HERO_IDS.filter(id => id === 'ranger' || input.unlockedHeroes?.includes(id))
    : ['ranger' as HeroId];
  const weapons = Array.isArray(input.unlockedWeapons)
    ? WEAPON_IDS.filter(id => id === 'bow' || input.unlockedWeapons?.includes(id))
    : ['bow' as WeaponId];
  const heroLevels = { ...defaults.heroLevels };
  const weaponLevels = { ...defaults.weaponLevels };
  const permanentLevels = defaultPermanentLevels();
  for (const id of HERO_IDS) heroLevels[id] = validLevel(input.heroLevels?.[id], 1, MAX_HERO_LEVEL);
  for (const id of WEAPON_IDS) weaponLevels[id] = validLevel(input.weaponLevels?.[id], 1, MAX_WEAPON_LEVEL);
  for (const id of PERMANENT_UPGRADE_IDS) {
    permanentLevels[id] = validLevel(input.permanentLevels?.[id], 0, MAX_PERMANENT_LEVEL);
  }
  const selectedHero = heroes.includes(input.selectedHero as HeroId) ? input.selectedHero as HeroId : 'ranger';
  const selectedWeapon = weapons.includes(input.selectedWeapon as WeaponId) ? input.selectedWeapon as WeaponId : 'bow';
  const settings = input.settings;
  return {
    version: 2,
    gold: typeof input.gold === 'number' && Number.isFinite(input.gold)
      ? validLevel(input.gold, 0, MAX_GOLD) : 0,
    selectedHero, selectedWeapon, unlockedHeroes: heroes, unlockedWeapons: weapons,
    heroLevels, weaponLevels, permanentLevels,
    highestRoom: validLevel(input.highestRoom, 1, 20),
    settledRunIds: Array.isArray(input.settledRunIds)
      ? [...new Set(input.settledRunIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100,
        ))].slice(-MAX_SETTLED_RUNS) : [],
    settings: {
      musicEnabled: typeof settings?.musicEnabled === 'boolean' ? settings.musicEnabled : true,
      sfxEnabled: typeof settings?.sfxEnabled === 'boolean' ? settings.sfxEnabled : true,
    },
  };
}

export type ProfileAction =
  | { type: 'selectHero'; id: HeroId }
  | { type: 'selectWeapon'; id: WeaponId }
  | { type: 'unlockHero'; id: HeroId }
  | { type: 'unlockWeapon'; id: WeaponId }
  | { type: 'upgradeHero'; id: HeroId }
  | { type: 'upgradeWeapon'; id: WeaponId }
  | { type: 'upgradePermanent'; id: PermanentUpgradeId }
  | { type: 'setSetting'; key: 'musicEnabled' | 'sfxEnabled'; value: boolean }
  | { type: 'settleRun'; report: RunReport }
  // Retained for compatibility with phase-5 tests; gameplay uses settleRun only.
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
    case 'upgradePermanent': {
      const level = p.permanentLevels[action.id];
      const cost = permanentUpgradeCost(action.id, level);
      if (level >= MAX_PERMANENT_LEVEL || p.gold < cost) return p;
      return {
        ...p, gold: p.gold - cost,
        permanentLevels: { ...p.permanentLevels, [action.id]: level + 1 },
      };
    }
    case 'setSetting': return { ...p, settings: { ...p.settings, [action.key]: action.value } };
    case 'awardGold':
      return {
        ...p, gold: Math.min(MAX_GOLD,
          p.gold + (Number.isFinite(action.amount) ? Math.max(0, Math.floor(action.amount)) : 0)),
      };
    case 'settleRun': {
      const { report } = action;
      if (!report.runId || report.runId.length > 100 || p.settledRunIds.includes(report.runId)) return p;
      const reward = Number.isFinite(report.earnedGold)
        ? Math.max(0, Math.min(MAX_GOLD, Math.floor(report.earnedGold))) : 0;
      const reached = validLevel(report.reachedRoom, 1, 20);
      return {
        ...p, gold: Math.min(MAX_GOLD, p.gold + reward),
        highestRoom: Math.max(p.highestRoom, reached),
        settledRunIds: [...p.settledRunIds, report.runId].slice(-MAX_SETTLED_RUNS),
      };
    }
  }
}

/** Versioned local save manager. Phase-5 v1 saves are migrated without losing purchases. */
export class SaveManager {
  private profile: Profile;
  public constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
    const store = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    let loaded: unknown;
    try {
      const raw = store?.getItem(STORAGE_KEY) ?? store?.getItem(LEGACY_KEY);
      loaded = raw ? JSON.parse(raw) : null;
    } catch { loaded = null; }
    this.profile = validateProfile(loaded);
  }
  public get current(): Readonly<Profile> { return this.profile; }
  private save(): void {
    try {
      const store = this.storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
      store?.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch { /* Browser storage can be disabled; keep in-memory progress. */ }
  }
  public dispatch(action: ProfileAction): boolean {
    const next = applyProfileAction(this.profile, action);
    if (JSON.stringify(next) === JSON.stringify(this.profile)) return false;
    this.profile = next;
    this.save();
    return true;
  }
  public reset(): void {
    this.profile = defaultProfile();
    try {
      const store = this.storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
      store?.removeItem(LEGACY_KEY);
    } catch { /* Ignore unavailable storage. */ }
    this.save();
  }
}
export class ProgressStore extends SaveManager {}
export const progressStore = new SaveManager();

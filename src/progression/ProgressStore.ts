import { HERO_IDS, HEROES, MAX_HERO_LEVEL, type HeroId } from '../heroes/heroConfig';
import {
  HERO_STARTER_WEAPON, MAX_WEAPON_LEVEL, WEAPON_IDS, WEAPONS, isWeaponUnlockedForHero,
  weaponBelongsToHero, weaponUpgradeCost, type WeaponId,
} from '../weapons/weaponConfig';
import {
  defaultPermanentLevels, MAX_PERMANENT_LEVEL, PERMANENT_UPGRADE_IDS,
  type PermanentLevels, type PermanentUpgradeId,
} from './economy';
import type { RunReport } from './RunLedger';
import { ARMOR_SLOTS, ARMOR_MAX_LEVEL, ARMOR_MAX_STARS, RARITY_CONFIG,
  armorDefinition, armorUpgradeCost, validArmorItem,
  type ArmorItem, type ArmorSlot } from './armor';
import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { WORLD_COUNT, isWorldUnlocked, toWorldId, type WorldId } from '../worlds/worldConfig';
import {
  defaultKeyBindings, rebindKey, validateKeyBindings,
  type ControlAction, type KeyBindings,
} from '../input/keyBindings';
import {
  ABILITIES, ABILITY_IDS, MAX_ABILITY_LEVEL, abilityUpgradeCost, isAbilityUnlocked,
  type AbilityId,
} from '../abilities/abilityConfig';

const STORAGE_KEY = 'dungeon-ascent:profile:v4';
const LEGACY_KEYS = [
  'dungeon-ascent:profile:v3', 'dungeon-ascent:profile:v2', 'dungeon-ascent:profile:v1',
] as const;
const MAX_GOLD = 1_000_000_000;
/** XP needed to go from the given hero level to the next one. */
export const heroXpRequirement = (level: number): number => 30 + Math.max(0, level - 1) * 20;
const MAX_SETTLED_RUNS = 64;

export interface Profile {
  version: 4;
  gold: number;
  selectedHero: HeroId;
  selectedWeapon: WeaponId;
  selectedWeapons: Record<HeroId, WeaponId>;
  unlockedHeroes: HeroId[];
  unlockedWeapons: WeaponId[];
  heroLevels: Record<HeroId, number>;
  heroXp: Record<HeroId, number>;
  weaponLevels: Record<WeaponId, number>;
  abilityLevels: Record<AbilityId, number>;
  permanentLevels: PermanentLevels;
  armorInventory: ArmorItem[];
  equippedArmor: Record<HeroId, Record<ArmorSlot, string | null>>;
  lastArmorDrop: { runId: string; items: ArmorItem[] } | null;
  highestRoom: number;
  selectedWorld: WorldId;
  completedWorlds: number;
  worldBestRooms: number[];
  totalGoldEarned: number;
  settledRunIds: string[];
  settings: { musicEnabled: boolean; sfxEnabled: boolean; keyBindings: KeyBindings };
}
export function defaultProfile(): Profile {
  return {
    version: 4, gold: 150, selectedHero: 'guardian', selectedWeapon: 'sunblade',
    selectedWeapons: { ranger: 'bow', mage: 'staff', guardian: 'sunblade', frostblade: 'iceblade',
      pyromancer: 'emberstaff', stormstrider: 'lightning', voidwalker: 'voidorb' },
    unlockedHeroes: ['guardian'], unlockedWeapons: ['sunblade'],
    heroLevels: Object.fromEntries(HERO_IDS.map(id => [id, 1])) as Record<HeroId, number>,
    heroXp: Object.fromEntries(HERO_IDS.map(id => [id, 0])) as Record<HeroId, number>,
    weaponLevels: Object.fromEntries(WEAPON_IDS.map(id => [id, 1])) as Record<WeaponId, number>,
    abilityLevels: Object.fromEntries(ABILITY_IDS.map(id => [id, 1])) as Record<AbilityId, number>,
    permanentLevels: defaultPermanentLevels(),
    armorInventory: [], equippedArmor: Object.fromEntries(HERO_IDS.map(heroId => [heroId,
      { helm: null, body: null, boots: null }])) as Record<HeroId, Record<ArmorSlot, string | null>>,
    lastArmorDrop: null, highestRoom: 1,
    selectedWorld: 1, completedWorlds: 0, worldBestRooms: [1, 1, 1, 1, 1],
    totalGoldEarned: 0,
    settledRunIds: [], settings: { musicEnabled: true, sfxEnabled: true, keyBindings: defaultKeyBindings() },
  };
}
const validLevel = (n: unknown, min: number, max: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : min;

export function validateProfile(raw: unknown): Profile {
  const defaults = defaultProfile();
  if (!raw || typeof raw !== 'object' ||
    ![1, 2, 3, 4].includes((raw as { version?: number }).version ?? -1)) return defaults;
  const input = raw as Partial<Profile>;
  const fallbackHero: HeroId = 'guardian';
  const legacyHeroes = Array.isArray(input.unlockedHeroes) ? input.unlockedHeroes : [];
  const worldOneProgress = Array.isArray(input.worldBestRooms)
    ? validLevel(input.worldBestRooms[0], 1, CHAPTER_ROOM_COUNT)
    : validLevel(input.highestRoom, 1, CHAPTER_ROOM_COUNT);
  const heroes = HERO_IDS.filter(id => id === 'guardian' ||
    (id === 'ranger' && worldOneProgress >= 10) ||
    (id === 'mage' && worldOneProgress >= 20) ||
    (id !== 'ranger' && id !== 'mage' && legacyHeroes.includes(id)));
  const heroLevels = { ...defaults.heroLevels };
  const heroXp = { ...defaults.heroXp };
  for (const id of HERO_IDS) heroXp[id] = validLevel((input as Partial<Profile>).heroXp?.[id], 0, 1_000_000_000);
  const weaponLevels = { ...defaults.weaponLevels };
  const abilityLevels = { ...defaults.abilityLevels };
  const permanentLevels = defaultPermanentLevels();
  for (const id of HERO_IDS) heroLevels[id] = validLevel(input.heroLevels?.[id], 1, MAX_HERO_LEVEL);
  // Unlocks depend on each hero's current level rather than the old gold purchases.
  // Existing saves retain hero levels and gain the alternate weapon once eligible.
  const weapons = WEAPON_IDS.filter(id =>
    heroes.includes(WEAPONS[id].heroId) &&
    isWeaponUnlockedForHero(id, WEAPONS[id].heroId, heroLevels[WEAPONS[id].heroId]));
  for (const id of WEAPON_IDS) weaponLevels[id] = validLevel(input.weaponLevels?.[id], 1, MAX_WEAPON_LEVEL);
  for (const id of ABILITY_IDS) abilityLevels[id] = validLevel(
    input.abilityLevels?.[id], 1, MAX_ABILITY_LEVEL);
  for (const id of PERMANENT_UPGRADE_IDS) {
    permanentLevels[id] = validLevel(input.permanentLevels?.[id], 0, MAX_PERMANENT_LEVEL);
  }
  const armorInventory: ArmorItem[] = [];
  const seenArmorIds = new Set<string>();
  if (Array.isArray(input.armorInventory)) {
    for (const entry of input.armorInventory) {
      // Migration: legacy pieces were shared. Bind them to the active hero once.
      const legacy = entry && typeof entry === 'object' && !('heroId' in entry);
      const candidate = legacy && typeof (entry as ArmorItem).kind === 'string'
        ? { ...(entry as ArmorItem), heroId: input.selectedHero && HERO_IDS.includes(input.selectedHero)
          ? input.selectedHero : fallbackHero,
          kind: (input.selectedHero && HERO_IDS.includes(input.selectedHero)
            ? input.selectedHero : fallbackHero) + '-' + (entry as ArmorItem).kind }
        : entry;
      if (!validArmorItem(candidate) || seenArmorIds.has(candidate.id) || armorInventory.length >= 250) continue;
      seenArmorIds.add(candidate.id);
      armorInventory.push({ ...candidate });
    }
  }
  const equippedArmor = Object.fromEntries(HERO_IDS.map(heroId => [heroId,
    { helm: null, body: null, boots: null }])) as Record<HeroId, Record<ArmorSlot, string | null>>;
  const rawEquipped = input.equippedArmor as unknown as Record<string, unknown> | undefined;
  for (const heroId of HERO_IDS) {
    for (const slot of ARMOR_SLOTS) {
      const heroSlots = rawEquipped?.[heroId] as Record<string, unknown> | undefined;
      const selectedId = heroSlots?.[slot] ??
        (heroId === input.selectedHero ? rawEquipped?.[slot] : undefined);
      if (typeof selectedId === 'string' && armorInventory.some(item =>
        item.id === selectedId && item.heroId === heroId && armorDefinition(item).slot === slot))
        equippedArmor[heroId][slot] = selectedId;
    }
  }
  const rawDrop = input.lastArmorDrop;
  const lastArmorDrop = rawDrop && typeof rawDrop.runId === 'string' &&
    rawDrop.runId.length <= 100
    ? { runId: rawDrop.runId, items: (Array.isArray((rawDrop as { items?: unknown }).items)
      ? (rawDrop as { items: unknown[] }).items : (rawDrop as unknown as { item?: unknown }).item ? [(rawDrop as unknown as { item?: unknown }).item] : [])
      .filter(validArmorItem).slice(0, 2) }
    : null;
  const selectedHero = heroes.includes(input.selectedHero as HeroId) ? input.selectedHero as HeroId : fallbackHero;
  const requestedSelections = input.selectedWeapons as Partial<Record<HeroId, WeaponId>> | undefined;
  const selectedWeapons = { ...defaults.selectedWeapons };
  for (const heroId of HERO_IDS) {
    const requested = requestedSelections?.[heroId] ??
      (heroId === selectedHero ? input.selectedWeapon : undefined);
    selectedWeapons[heroId] = requested && weapons.includes(requested) &&
      weaponBelongsToHero(requested, heroId) ? requested : HERO_STARTER_WEAPON[heroId];
  }
  const selectedWeapon = selectedWeapons[selectedHero];
  const settings = input.settings;
  const completedWorlds = validLevel(input.completedWorlds, 0, WORLD_COUNT);
  const requestedWorld = toWorldId(input.selectedWorld);
  const selectedWorld = isWorldUnlocked(requestedWorld, completedWorlds) ? requestedWorld : 1;
  const worldBestRooms = Array.from({ length: WORLD_COUNT }, (_, index) =>
    validLevel(input.worldBestRooms?.[index],
      1, CHAPTER_ROOM_COUNT));
  // Existing v2 profiles tracked one chapter. Preserve that record in world 1
  // even if no world-specific fields exist yet.
  if (!Array.isArray(input.worldBestRooms)) {
    worldBestRooms[0] = Math.max(worldBestRooms[0]!,
      validLevel(input.highestRoom, 1, CHAPTER_ROOM_COUNT));
  }
  return {
    version: 4,
    gold: typeof input.gold === 'number' && Number.isFinite(input.gold)
      ? validLevel(input.gold, 0, MAX_GOLD) : 0,
    selectedHero, selectedWeapon, selectedWeapons, unlockedHeroes: heroes, unlockedWeapons: weapons,
    heroLevels, heroXp, weaponLevels, abilityLevels, permanentLevels,
    armorInventory, equippedArmor, lastArmorDrop,
    highestRoom: validLevel(input.highestRoom, 1, CHAPTER_ROOM_COUNT),
    selectedWorld, completedWorlds, worldBestRooms,
    totalGoldEarned: validLevel(input.totalGoldEarned, 0, MAX_GOLD),
    settledRunIds: Array.isArray(input.settledRunIds)
      ? [...new Set(input.settledRunIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100,
        ))].slice(-MAX_SETTLED_RUNS) : [],
    settings: {
      musicEnabled: typeof settings?.musicEnabled === 'boolean' ? settings.musicEnabled : true,
      sfxEnabled: typeof settings?.sfxEnabled === 'boolean' ? settings.sfxEnabled : true,
      keyBindings: validateKeyBindings(settings?.keyBindings),
    },
  };
}

export type ProfileAction =
  | { type: 'selectWorld'; id: WorldId }
  | { type: 'selectHero'; id: HeroId }
  | { type: 'selectWeapon'; id: WeaponId }
  | { type: 'unlockHero'; id: HeroId }
  | { type: 'unlockWeapon'; id: WeaponId }
  | { type: 'upgradeHero'; id: HeroId }
  | { type: 'collectHeroXp'; id: HeroId; amount: number }
  | { type: 'upgradeWeapon'; id: WeaponId }
  | { type: 'upgradeAbility'; id: AbilityId }
  | { type: 'upgradePermanent'; id: PermanentUpgradeId }
  | { type: 'collectArmor'; item: ArmorItem }
  | { type: 'reachRoom'; worldId: WorldId; room: number }
  | { type: 'equipArmor'; id: string }
  | { type: 'unequipArmor'; heroId: HeroId; slot: ArmorSlot }
  | { type: 'upgradeArmor'; id: string }
  | { type: 'fuseArmor'; id: string }
  | { type: 'sellArmor'; id: string }
  | { type: 'setSetting'; key: 'musicEnabled' | 'sfxEnabled'; value: boolean }
  | { type: 'rebindKey'; action: ControlAction; key: string }
  | { type: 'resetKeyBindings' }
  | { type: 'settleRun'; report: RunReport; heroId?: HeroId }
  // Retained for compatibility with phase-5 tests; gameplay uses settleRun only.
  | { type: 'awardGold'; amount: number };

export function applyProfileAction(profile: Profile, action: ProfileAction): Profile {
  const p = validateProfile(profile);
  switch (action.type) {
    case 'selectWorld':
      return isWorldUnlocked(action.id, p.completedWorlds) ? { ...p, selectedWorld: action.id } : p;
    case 'selectHero':
      return p.unlockedHeroes.includes(action.id) ? {
        ...p, selectedHero: action.id, selectedWeapon: p.selectedWeapons[action.id],
      } : p;
    case 'selectWeapon':
      return p.unlockedWeapons.includes(action.id) && weaponBelongsToHero(action.id, p.selectedHero)
        ? { ...p, selectedWeapon: action.id,
            selectedWeapons: { ...p.selectedWeapons, [p.selectedHero]: action.id } }
        : p;
    case 'unlockHero': {
      // World-one milestone heroes are never sold for gold.
      if (action.id === 'ranger' || action.id === 'mage' || action.id === 'guardian') return p;
      const cost = HEROES[action.id].unlockCost;
      if (p.unlockedHeroes.includes(action.id) || p.gold < cost ||
        !isWorldUnlocked(HEROES[action.id].requiredWorld, p.completedWorlds)) return p;
      const starter = HERO_STARTER_WEAPON[action.id];
      return {
        ...p, gold: p.gold - cost,
        unlockedHeroes: [...p.unlockedHeroes, action.id],
        unlockedWeapons: p.unlockedWeapons.includes(starter)
          ? p.unlockedWeapons : [...p.unlockedWeapons, starter],
        selectedHero: action.id, selectedWeapon: starter,
        selectedWeapons: { ...p.selectedWeapons, [action.id]: starter },
      };
    }
    case 'reachRoom': {
      if (action.worldId !== 1 || !Number.isSafeInteger(action.room) || action.room < 1 ||
        action.room > CHAPTER_ROOM_COUNT) return p;
      const worldBestRooms = [...p.worldBestRooms];
      worldBestRooms[0] = Math.max(worldBestRooms[0]!, action.room);
      const unlockedHeroes = HERO_IDS.filter(id => p.unlockedHeroes.includes(id) ||
        id === 'ranger' && worldBestRooms[0]! >= 10 ||
        id === 'mage' && worldBestRooms[0]! >= 20);
      const unlockedWeapons = WEAPON_IDS.filter(id => p.unlockedWeapons.includes(id) ||
        unlockedHeroes.includes(WEAPONS[id].heroId) &&
        isWeaponUnlockedForHero(id, WEAPONS[id].heroId, p.heroLevels[WEAPONS[id].heroId]));
      return { ...p, highestRoom: Math.max(p.highestRoom, action.room),
        worldBestRooms, unlockedHeroes, unlockedWeapons };
    }
    case 'collectArmor': {
      const item = action.item;
      if (!validArmorItem(item) || !p.unlockedHeroes.includes(item.heroId) ||
        p.armorInventory.length >= 250 || p.armorInventory.some(x => x.id === item.id)) return p;
      return { ...p, armorInventory: [...p.armorInventory, { ...item }] };
    }
    case 'unlockWeapon': return p; // Alternate weapons unlock automatically via hero XP.
    case 'upgradeHero': return p; // Hero levels can only be earned with XP.
    case 'collectHeroXp': {
      if (!p.unlockedHeroes.includes(action.id) || !Number.isSafeInteger(action.amount) || action.amount <= 0) return p;
      let level = p.heroLevels[action.id];
      let xp = Math.min(1_000_000_000, p.heroXp[action.id] + action.amount);
      while (level < MAX_HERO_LEVEL && xp >= heroXpRequirement(level)) {
        xp -= heroXpRequirement(level);
        level++;
      }
      const unlockedWeapons = level >= 10
        ? WEAPON_IDS.filter(id => p.unlockedWeapons.includes(id) ||
            (WEAPONS[id].heroId === action.id &&
              isWeaponUnlockedForHero(id, action.id, level)))
        : p.unlockedWeapons;
      return { ...p, heroLevels: { ...p.heroLevels, [action.id]: level },
        heroXp: { ...p.heroXp, [action.id]: level >= MAX_HERO_LEVEL ? 0 : xp },
        unlockedWeapons };
    }
    case 'upgradeWeapon': {
      if (!p.unlockedWeapons.includes(action.id) ||
        !p.unlockedHeroes.includes(WEAPONS[action.id].heroId)) return p;
      const level = p.weaponLevels[action.id];
      const cost = weaponUpgradeCost(level);
      if (level >= MAX_WEAPON_LEVEL || p.gold < cost) return p;
      return { ...p, gold: p.gold - cost, weaponLevels: { ...p.weaponLevels, [action.id]: level + 1 } };
    }
    case 'upgradeAbility': {
      const ability = ABILITIES[action.id];
      if (!p.unlockedHeroes.includes(ability.heroId) ||
        !isAbilityUnlocked(action.id, p.heroLevels[ability.heroId])) return p;
      const level = p.abilityLevels[action.id];
      const cost = abilityUpgradeCost(level);
      if (level >= MAX_ABILITY_LEVEL || p.gold < cost) return p;
      return { ...p, gold: p.gold - cost,
        abilityLevels: { ...p.abilityLevels, [action.id]: level + 1 } };
    }
    case 'equipArmor': {
      const item = p.armorInventory.find(x => x.id === action.id);
      if (!item) return p;
      const slot = armorDefinition(item).slot;
      if (!p.unlockedHeroes.includes(item.heroId)) return p;
      return { ...p, equippedArmor: { ...p.equippedArmor,
        [item.heroId]: { ...p.equippedArmor[item.heroId], [slot]: item.id } } };
    }
    case 'unequipArmor':
      return HERO_IDS.includes(action.heroId) && ARMOR_SLOTS.includes(action.slot) &&
        p.equippedArmor[action.heroId][action.slot] !== null
        ? { ...p, equippedArmor: { ...p.equippedArmor,
            [action.heroId]: { ...p.equippedArmor[action.heroId], [action.slot]: null } } } : p;
    case 'upgradeArmor': {
      const item = p.armorInventory.find(x => x.id === action.id);
      if (!item || item.level >= ARMOR_MAX_LEVEL) return p;
      const cost = armorUpgradeCost(item);
      if (p.gold < cost) return p;
      return { ...p, gold: p.gold - cost, armorInventory: p.armorInventory.map(x =>
        x.id === item.id ? { ...x, level: x.level + 1 } : x) };
    }
    case 'fuseArmor': {
      const item = p.armorInventory.find(x => x.id === action.id);
      if (!item || item.stars >= ARMOR_MAX_STARS) return p;
      const duplicate = p.armorInventory.find(x => x.id !== item.id &&
        x.kind === item.kind && x.rarity === item.rarity && x.stars === item.stars);
      if (!duplicate) return p;
      const equippedArmor = Object.fromEntries(HERO_IDS.map(heroId => [
        heroId, { ...p.equippedArmor[heroId] }])) as Profile['equippedArmor'];
      for (const slot of ARMOR_SLOTS) {
        if (equippedArmor[item.heroId][slot] === duplicate.id)
          equippedArmor[item.heroId][slot] = item.id;
      }
      return { ...p, equippedArmor, armorInventory: p.armorInventory
        .filter(x => x.id !== duplicate.id).map(x =>
          x.id === item.id ? { ...x, stars: x.stars + 1 } : x) };
    }
    case 'sellArmor': {
      const item = p.armorInventory.find(x => x.id === action.id);
      if (!item) return p;
      const equippedArmor = Object.fromEntries(HERO_IDS.map(heroId => [
        heroId, { ...p.equippedArmor[heroId] }])) as Profile['equippedArmor'];
      for (const slot of ARMOR_SLOTS) {
        if (equippedArmor[item.heroId][slot] === item.id)
          equippedArmor[item.heroId][slot] = null;
      }
      return { ...p, gold: Math.min(MAX_GOLD, p.gold + RARITY_CONFIG[item.rarity].sell),
        equippedArmor, armorInventory: p.armorInventory.filter(x => x.id !== item.id) };
    }
    case 'upgradePermanent': return p; // Replaced by armor.
    case 'setSetting': return { ...p, settings: { ...p.settings, [action.key]: action.value } };
    case 'rebindKey': {
      const result = rebindKey(p.settings.keyBindings, action.action, action.key);
      return result.ok ? { ...p, settings: { ...p.settings, keyBindings: result.bindings } } : p;
    }
    case 'resetKeyBindings':
      return { ...p, settings: { ...p.settings, keyBindings: defaultKeyBindings() } };
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
      const reached = validLevel(report.reachedRoom, 1, CHAPTER_ROOM_COUNT);
      const worldId = toWorldId(report.worldId);
      const worldBestRooms = [...p.worldBestRooms];
      worldBestRooms[worldId - 1] = Math.max(worldBestRooms[worldId - 1] ?? 1, reached);
      // Only the currently playable next world can unlock a new world.
      const completesWorld = report.victory && reached === CHAPTER_ROOM_COUNT &&
        worldId <= p.completedWorlds + 1;
      const completedWorlds = completesWorld ?
        Math.max(p.completedWorlds, worldId) : p.completedWorlds;
      const unlockedHeroes = HERO_IDS.filter(id => p.unlockedHeroes.includes(id) ||
        worldId === 1 && (id === 'ranger' && reached >= 10 ||
          id === 'mage' && reached >= 20));
      const unlockedWeapons = WEAPON_IDS.filter(id => p.unlockedWeapons.includes(id) ||
        unlockedHeroes.includes(WEAPONS[id].heroId) &&
        isWeaponUnlockedForHero(id, WEAPONS[id].heroId, p.heroLevels[WEAPONS[id].heroId]));
      return {
        ...p, gold: Math.min(MAX_GOLD, p.gold + reward),
        unlockedHeroes, unlockedWeapons,
        lastArmorDrop: null,
        totalGoldEarned: Math.min(MAX_GOLD, p.totalGoldEarned + reward),
        highestRoom: Math.max(p.highestRoom, reached),
        worldBestRooms, completedWorlds,
        settledRunIds: [...p.settledRunIds, report.runId].slice(-MAX_SETTLED_RUNS),
      };
    }
  }
}

/** Versioned local save manager. Phase-5 v1 saves are migrated without losing purchases. */
export class SaveManager {
  private profile: Profile;
  public constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
    let loaded: unknown;
    try {
      // Accessing localStorage itself may throw on restrictive mobile browsers.
      const store = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
      const raw = store?.getItem(STORAGE_KEY) ?? LEGACY_KEYS
        .map(key => store?.getItem(key)).find(value => value !== null && value !== undefined);
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
      for (const key of LEGACY_KEYS) store?.removeItem(key);
    } catch { /* Ignore unavailable storage. */ }
    this.save();
  }
}
export class ProgressStore extends SaveManager {}
export const progressStore = new SaveManager();

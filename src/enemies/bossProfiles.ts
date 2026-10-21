import type { BulletPattern } from './projectilePatterns';
import type { WorldId } from '../worlds/worldConfig';

export interface BossMode {
  patterns: readonly BulletPattern[];
  /** Minefield telegraphs are resolved into delayed explosions by GameScene. */
  bombs: number;
  radius: number;
  windupMs: number;
  /** Multiplier of normal attack interval; <1 = faster. */
  tempo: number;
  dashEvery: number;
  speed: number;
}
export interface BossProfile {
  name: string;
  color: number;
  preferredRange: number;
  phaseOne: BossMode;
  phaseTwo: BossMode;
}

const mode = (patterns: BulletPattern[], tempo: number, bombs = 0,
  radius = 58, windupMs = 1000, dashEvery = 0, speed = 1): BossMode =>
  ({ patterns, bombs, radius, windupMs, tempo, dashEvery, speed });

/** Ten purposefully different boss archetypes. Their phase-two attacks are not cosmetic. */
export const BOSSES: readonly BossProfile[] = [
  { name: 'Stone Warden', color: 0x94a3b8, preferredRange: 130,
    phaseOne: mode(['fan'], 1.1, 0, 58, 1000, 3),
    phaseTwo: mode(['cross', 'fan'], 0.82, 0, 58, 1000, 2) },
  { name: 'Ember Colossus', color: 0xfb923c, preferredRange: 180,
    phaseOne: mode(['single'], 1.3, 2, 56, 1050),
    phaseTwo: mode(['fan'], 1.06, 4, 61, 910) },
  { name: 'Frost Tyrant', color: 0x7dd3fc, preferredRange: 210,
    phaseOne: mode(['double'], 0.95),
    phaseTwo: mode(['ring', 'double'], 0.89, 1, 51, 1100) },
  { name: 'Void Sentinel', color: 0xc084fc, preferredRange: 175,
    phaseOne: mode(['spiral'], 0.28),
    phaseTwo: mode(['spiral', 'reverse-spiral'], 0.19) },
  { name: 'Iron Gunner', color: 0xf97373, preferredRange: 225,
    phaseOne: mode(['machinegun'], 0.12, 0, 58, 1000, 0, 1.3),
    phaseTwo: mode(['ring', 'machinegun', 'machinegun'], 0.16, 0, 58, 1000, 0, 1.25) },
  { name: 'Storm Weaver', color: 0x67e8f9, preferredRange: 175,
    phaseOne: mode(['cross', 'double'], 0.8),
    phaseTwo: mode(['ring', 'spiral', 'cross'], 0.52, 1, 47, 920) },
  { name: 'Mire Alchemist', color: 0x84cc16, preferredRange: 230,
    phaseOne: mode(['single'], 1.2, 3, 55, 1200),
    phaseTwo: mode(['wide', 'single'], 0.9, 5, 62, 1050) },
  { name: 'Crystal Matriarch', color: 0xf0abfc, preferredRange: 200,
    phaseOne: mode(['ring'], 0.52),
    phaseTwo: mode(['offset-ring', 'cross'], 0.37, 0, 55, 900) },
  { name: 'Rift Stalker', color: 0x22d3ee, preferredRange: 105,
    phaseOne: mode(['needle'], 1.05, 0, 55, 1000, 2),
    phaseTwo: mode(['wide', 'needle'], 0.72, 0, 55, 1000, 1) },
  { name: 'Astral Sovereign', color: 0xfde68a, preferredRange: 170,
    phaseOne: mode(['wide', 'spiral'], 0.72, 2, 54, 1000),
    phaseTwo: mode(['offset-ring', 'wide', 'machinegun'], 0.53, 4, 58, 900, 3) },
] as const;

/** Original archetype indices retained for all five worlds.
 * Chamber 15 deliberately contains Gunner + Sentinel simultaneously.
 */
export const BOSS_ENCOUNTER_ARCHETYPES: Readonly<Record<number, readonly number[]>> = {
  5: [0], 10: [2], 15: [4, 3], 20: [6], 25: [7], 30: [9],
};
export function getBossTier(roomNumber: number): number {
  return Math.min(6, Math.max(1, Math.floor(roomNumber / 5)));
}
/** World 1 swaps the actual encounter archetype, not just its label. */
export function getBossArchetypeIndex(roomNumber: number, bossSlot = 0, worldId: WorldId = 1): number {
  const room = Math.max(5, Math.min(30, Math.floor(roomNumber / 5) * 5));
  const encounter = worldId === 1 && room === 15 ? [6] :
    worldId === 1 && room === 20 ? [4, 3] : BOSS_ENCOUNTER_ARCHETYPES[room];
  return encounter?.[bossSlot] ?? encounter![0]!;
}
export function getBossProfile(roomNumber: number, bossSlot = 0, worldId: WorldId = 1): BossProfile {
  return BOSSES[getBossArchetypeIndex(roomNumber, bossSlot, worldId)]!;
}
export function getBossPlan(roomNumber: number, phase: 1 | 2, volley: number, bossSlot = 0,
  worldId: WorldId = 1): BossMode & { pattern: BulletPattern } {
  const boss = getBossProfile(roomNumber, bossSlot, worldId);
  const m = phase === 1 ? boss.phaseOne : boss.phaseTwo;
  return { ...m, pattern: m.patterns[Math.abs(Math.floor(volley)) % m.patterns.length]! };
}

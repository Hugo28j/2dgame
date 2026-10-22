import { CHAPTER_ROOM_COUNT } from '../rooms/roomConfig';
import { WORLDS, isWorldUnlocked, type WorldId, type WorldTheme } from './worldConfig';

export interface WorldAtlasEntry {
  readonly world: WorldTheme;
  readonly unlocked: boolean;
  readonly selected: boolean;
  readonly complete: boolean;
  readonly bestRoom: number;
  readonly progress: number;
  readonly requirement: string;
}

/** Reuses exactly the same unlock rules as ProgressStore's selectWorld action.
 * Rendering cards does not change save data or grant access to a locked realm. */
export function worldAtlasEntries(
  selectedWorld: WorldId, completedWorlds: number, worldBestRooms: readonly number[],
): readonly WorldAtlasEntry[] {
  return WORLDS.map(world => {
    const unlocked = isWorldUnlocked(world.id, completedWorlds);
    const bestRoom = Math.min(CHAPTER_ROOM_COUNT,
      Math.max(1, Math.trunc(worldBestRooms[world.id - 1] ?? 1)));
    return {
      world,
      unlocked,
      selected: world.id === selectedWorld,
      complete: bestRoom >= CHAPTER_ROOM_COUNT,
      bestRoom,
      progress: unlocked ? bestRoom / CHAPTER_ROOM_COUNT : 0,
      requirement: world.id === 1 ? '' : 'Voltooi wereld ' + (world.id - 1),
    };
  });
}
export function canTravelToWorld(worldId: WorldId, completedWorlds: number): boolean {
  return isWorldUnlocked(worldId, completedWorlds);
}

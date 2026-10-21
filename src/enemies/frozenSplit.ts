/** World-two ice giants split after defeat; Snow Sentinel's *summoned*
 * Glacier Golems never split into extra Puffs. Otherwise the boss encounter
 * generates a hidden cascade of enemies and can cause avoidable FPS spikes. */
export function shouldSplitFrozenGiant(
  worldId: number, kind: string, enemyId: string,
): boolean {
  return worldId === 2 && kind === 'tank' &&
    !enemyId.startsWith('sentinel-golem-');
}

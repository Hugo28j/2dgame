/** Keep combat precision internal while presenting stable whole HP values. */
export function displayedHp(value: number): number {
  return Number.isFinite(value) ? Math.ceil(value) : 0;
}

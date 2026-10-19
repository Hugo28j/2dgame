export class HitRegistry {
  private readonly targetIds = new Set<string>();

  public claim(targetId: string): boolean {
    if (this.targetIds.has(targetId)) {
      return false;
    }

    this.targetIds.add(targetId);
    return true;
  }
}

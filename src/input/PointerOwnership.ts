export class PointerOwnership {
  private pointerId: number | null = null;

  public get ownerId(): number | null {
    return this.pointerId;
  }

  public get isOwned(): boolean {
    return this.pointerId !== null;
  }

  public claim(pointerId: number): boolean {
    if (this.pointerId !== null && this.pointerId !== pointerId) {
      return false;
    }

    this.pointerId = pointerId;
    return true;
  }

  public owns(pointerId: number): boolean {
    return this.pointerId === pointerId;
  }

  public release(pointerId: number): boolean {
    if (!this.owns(pointerId)) {
      return false;
    }

    this.pointerId = null;
    return true;
  }

  public reset(): void {
    this.pointerId = null;
  }
}

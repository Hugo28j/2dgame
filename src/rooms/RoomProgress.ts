export class RoomProgress {
  public roomNumber = 1;
  public doorOpen = false;
  private plannedEnemies = 0;
  private defeatedEnemies = 0;

  public constructor(public readonly totalRooms: number) {
    if (totalRooms < 1) {
      throw new Error('A chapter must contain at least one room.');
    }
  }

  public reset(): void {
    this.roomNumber = 1;
    this.plannedEnemies = 0;
    this.defeatedEnemies = 0;
    this.doorOpen = false;
  }

  public startRoom(plannedEnemies: number): void {
    this.plannedEnemies = Math.max(0, Math.floor(plannedEnemies));
    this.defeatedEnemies = 0;
    this.doorOpen = this.plannedEnemies === 0;
  }

  public addRequiredEnemies(count: number): void {
    if (!this.doorOpen && Number.isSafeInteger(count) && count > 0) this.plannedEnemies += count;
  }

  public registerEnemyDefeated(): boolean {
    if (this.doorOpen) {
      return true;
    }

    this.defeatedEnemies = Math.min(this.plannedEnemies, this.defeatedEnemies + 1);
    this.doorOpen = this.defeatedEnemies === this.plannedEnemies;
    return this.doorOpen;
  }

  public advance(): number | null {
    if (!this.doorOpen || this.roomNumber >= this.totalRooms) {
      return null;
    }

    this.roomNumber += 1;
    this.doorOpen = false;
    return this.roomNumber;
  }

  public get chapterComplete(): boolean {
    return this.roomNumber === this.totalRooms && this.doorOpen;
  }
}

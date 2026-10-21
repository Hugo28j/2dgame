import type Phaser from 'phaser';
import type { ArenaRectangle } from '../rooms/roomConfig';

export interface IcePlate {
  readonly x: number; readonly y: number;
  readonly width: number; readonly height: number;
  readonly shade: number;
}
/** Deterministic staggered plates inside the ice arena. */
export function frozenPlates(bounds: ArenaRectangle, room: number): IcePlate[] {
  const plates: IcePlate[] = [];
  const left = bounds.x + 7, top = bounds.y + 7;
  const right = bounds.x + bounds.width - 7, bottom = bounds.y + bounds.height - 7;
  if (right <= left || bottom <= top) return plates;
  let row = 0;
  for (let y = top; y < bottom; y += 92, row++) {
    const stagger = row % 2 === 0 ? 0 : -48;
    let column = 0;
    for (let x = left + stagger; x < right; x += 118, column++) {
      const tileLeft = Math.max(left, x);
      const tileRight = Math.min(right, x + 118);
      if (tileRight - tileLeft <= 3) continue;
      plates.push({
        x: tileLeft, y, width: tileRight - tileLeft,
        height: Math.min(92, bottom - y), shade: (row * 7 + column * 3 + room) % 5,
      });
    }
  }
  return plates;
}
/** Static vector art generated only on room entry. */
export function drawFrozenFloor(
  g: Phaser.GameObjects.Graphics, bounds: ArenaRectangle, room: number,
): void {
  const shades = [0xecfaff, 0xdaf3fc, 0xc6eafa, 0xe1f8fe, 0xbde1f4];
  const plates = frozenPlates(bounds, room);
  for (let i = 0; i < plates.length; i++) {
    const plate = plates[i]!;
    const x = plate.x + 2, y = plate.y + 2;
    const w = Math.max(1, plate.width - 4), h = Math.max(1, plate.height - 4);
    g.fillStyle(shades[plate.shade]!, 0.94);
    g.fillRoundedRect(x, y, w, h, 9);
    g.lineStyle(1.5, 0x7aafc9, 0.51);
    g.strokeRoundedRect(x, y, w, h, 9);
    if (w > 42 && h > 32) {
      g.fillStyle(0xffffff, 0.30);
      g.fillEllipse(x + w * 0.35, y + h * 0.22, w * 0.45, 6);
      g.lineStyle(1.2, 0xffffff, 0.6);
      g.lineBetween(x + 10, y + h * 0.48, x + 24, y + h * 0.32);
    }
    if (i % 3 === 0 && w > 55 && h > 40) {
      const cx = x + w * 0.43, cy = y + h * 0.55;
      g.lineStyle(1.7, 0x74accb, 0.54);
      g.lineBetween(cx - 23, cy - 11, cx, cy);
      g.lineBetween(cx, cy, cx + 20, cy + 13);
      g.lineBetween(cx, cy, cx + 9, cy - 17);
      g.lineStyle(0.9, 0xffffff, 0.8);
      g.lineBetween(cx - 21, cy - 13, cx - 1, cy - 2);
    }
  }
  // Wind-blown drifts along the outer walls.
  g.fillStyle(0xffffff, 0.72);
  for (let i = 0; i < Math.ceil(bounds.width / 37); i++) {
    const x = bounds.x + 16 + i * 37;
    const r = 6 + (i * 7 + room) % 6;
    g.fillEllipse(x, bounds.y + 12, r * 2.4, r * 1.2);
    g.fillEllipse(x, bounds.y + bounds.height - 12, r * 2, r);
  }
  for (let i = 0; i < Math.ceil(bounds.height / 44); i++) {
    const y = bounds.y + 19 + i * 44;
    const r = 5 + (i * 5 + room) % 7;
    g.fillEllipse(bounds.x + 13, y, r, r * 2.6);
    g.fillEllipse(bounds.x + bounds.width - 13, y, r, r * 2.2);
  }
}

import Phaser from 'phaser';
import { WORLDS, type WorldId } from '../worlds/worldConfig';
import { getWorldBossArtRoster, getWorldCharacterRoster, type CharacterLook } from './worldCharacters';

/** Original hand-drawn vector sprites. All generated once at boot; no network
 * textures, runtime canvas animation, or per-frame graphics allocations. */
function worldMark(g: Phaser.GameObjects.Graphics, world: WorldId, color: number, x = 24, y = 12): void {
  g.lineStyle(2, color, 0.9);
  switch (world) {
    case 1: // A split leaf.
      g.fillStyle(color); g.fillEllipse(x - 3, y, 9, 5); g.fillEllipse(x + 4, y - 3, 8, 5);
      g.lineBetween(x - 5, y + 7, x + 5, y - 7);
      break;
    case 2: // Ice diamond.
      g.lineBetween(x, y - 8, x + 7, y);
      g.lineBetween(x + 7, y, x, y + 8);
      g.lineBetween(x, y + 8, x - 7, y);
      g.lineBetween(x - 7, y, x, y - 8);
      g.lineBetween(x - 7, y, x + 7, y);
      break;
    case 3: // Ember flame.
      g.fillStyle(color);
      g.fillTriangle(x, y - 9, x - 6, y + 5, x + 6, y + 5);
      g.fillStyle(0xfef3c7); g.fillCircle(x, y + 2, 2);
      break;
    case 4: // Zig-zag lightning.
      g.lineBetween(x + 2, y - 9, x - 5, y + 1);
      g.lineBetween(x - 5, y + 1, x + 2, y);
      g.lineBetween(x + 2, y, x - 3, y + 10);
      break;
    case 5: // Void eye.
      g.strokeCircle(x, y, 7);
      g.fillStyle(color); g.fillCircle(x, y, 3);
      g.lineBetween(x - 10, y, x - 7, y);
      g.lineBetween(x + 7, y, x + 10, y);
      break;
  }
}

function drawMinion(g: Phaser.GameObjects.Graphics, look: CharacterLook): void {
  g.fillStyle(0x07111b, 0.8); g.fillEllipse(24, 43, 37, 7);
  g.fillStyle(look.secondary, 0.9);
  if (look.worldId === 3) {
    drawEmberMinion(g, look);
    return;
  }
  switch (look.kind) {
    case 'slime':
      g.fillStyle(look.primary);
      g.fillRoundedRect(6, 18, 36, 24, 10);
      g.fillCircle(16, 22, 9); g.fillCircle(32, 23, 9);
      g.fillStyle(0x081b22); g.fillCircle(17, 27, 3); g.fillCircle(31, 27, 3);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(18, 26, 1.2); g.fillCircle(32, 26, 1.2);
      worldMark(g, look.worldId, 0xeaffce, 24, 15);
      break;
    case 'archer':
      // A distinct masked ranger with shoulders and a bow.
      g.fillStyle(look.primary); g.fillTriangle(24, 4, 9, 27, 39, 27);
      g.fillStyle(look.secondary); g.fillRoundedRect(13, 25, 22, 15, 4);
      g.fillStyle(0x09111c); g.fillEllipse(24, 22, 17, 12);
      g.fillStyle(0xfff4ca); g.fillRect(18, 20, 5, 2); g.fillRect(27, 20, 5, 2);
      g.lineStyle(3, look.primary); g.strokeCircle(39, 28, 10);
      g.lineStyle(1, 0xfde68a); g.lineBetween(39, 18, 39, 38);
      worldMark(g, look.worldId, 0xf8fafc, 24, 12);
      break;
    case 'charger':
      // Long low creature: horns, armored back, four claws.
      g.fillStyle(look.primary); g.fillEllipse(23, 29, 37, 23);
      g.fillStyle(look.secondary); g.fillTriangle(8, 23, 3, 4, 19, 17);
      g.fillTriangle(31, 17, 45, 4, 42, 25);
      g.fillStyle(0x0b1220); g.fillCircle(15, 28, 3); g.fillCircle(33, 28, 3);
      g.fillStyle(look.primary); g.fillRect(10, 35, 8, 9); g.fillRect(31, 35, 8, 9);
      worldMark(g, look.worldId, 0xffffff, 24, 22);
      break;
    case 'mage':
      // A hovering robe rather than a round enemy.
      g.fillStyle(look.primary); g.fillTriangle(24, 12, 8, 41, 40, 41);
      g.fillStyle(look.secondary); g.fillCircle(24, 18, 13);
      g.fillStyle(0x0a1125); g.fillEllipse(24, 19, 16, 15);
      g.fillStyle(0xfefce8); g.fillCircle(20, 18, 2); g.fillCircle(28, 18, 2);
      g.lineStyle(3, look.glow); g.strokeCircle(24, 12, 13);
      worldMark(g, look.worldId, 0xffffff, 24, 33);
      break;
    case 'tank':
      // Oversized shoulders, helmet and iron fists.
      g.fillStyle(look.primary); g.fillRoundedRect(9, 12, 30, 31, 6);
      g.fillStyle(look.secondary); g.fillRoundedRect(2, 20, 14, 20, 4);
      g.fillRoundedRect(32, 20, 14, 20, 4);
      g.fillStyle(0x091622); g.fillRect(16, 18, 16, 9);
      g.fillStyle(0xfef08a); g.fillRect(18, 21, 4, 3); g.fillRect(27, 21, 4, 3);
      g.fillStyle(look.secondary); g.fillRect(15, 5, 18, 10);
      worldMark(g, look.worldId, 0xffffff, 24, 34);
      break;
    case 'bomber':
      // Round mine with an explosive core and an unmistakable fuse.
      g.fillStyle(look.primary); g.fillCircle(24, 27, 17);
      g.lineStyle(3, look.secondary); g.strokeCircle(24, 27, 14);
      g.fillStyle(0x0f172a); g.fillCircle(24, 27, 8);
      g.fillStyle(0xfff7c2); g.fillCircle(24, 27, 4);
      g.lineStyle(3, look.secondary); g.lineBetween(23, 11, 28, 4);
      g.fillStyle(0xfde047); g.fillCircle(29, 4, 4);
      worldMark(g, look.worldId, 0xffffff, 24, 27);
      break;
    default: break;
  }
}

/** Six purpose-built silhouettes for Ember Wastes instead of recolored mobs. */
function drawEmberMinion(g: Phaser.GameObjects.Graphics, look: CharacterLook): void {
  switch (look.kind) {
    case 'slime': // Ash Crawler: low, six-legged coal beetle.
      g.fillStyle(0x2b1b1b); g.fillEllipse(24, 29, 34, 23);
      g.fillStyle(0x9a3412); g.fillEllipse(24, 25, 27, 17);
      g.lineStyle(4, 0x431407);
      for (const y of [27, 35]) { g.lineBetween(12, y, 4, y + 5); g.lineBetween(36, y, 44, y + 5); }
      g.fillStyle(0xfde047); g.fillCircle(16, 27, 2.5); g.fillCircle(32, 27, 2.5);
      g.fillStyle(0xf97316); g.fillTriangle(18, 18, 24, 3, 29, 19);
      break;
    case 'archer': // Furnace Breather: masked goblin with a brass nozzle.
      g.fillStyle(0x7c2d12); g.fillRoundedRect(10, 17, 26, 25, 7);
      g.fillStyle(0x292524); g.fillCircle(23, 17, 13);
      g.fillStyle(0xfbbf24); g.fillRoundedRect(13, 15, 22, 8, 3);
      g.fillStyle(0x451a03); g.fillRect(32, 17, 13, 5);
      g.fillStyle(0xf97316); g.fillTriangle(44, 14, 48, 20, 44, 25);
      g.fillStyle(0xfffbeb); g.fillCircle(19, 16, 2); g.fillCircle(27, 16, 2);
      break;
    case 'charger': // Blazehound: long, lean fire beast.
      g.fillStyle(0x7f1d1d); g.fillEllipse(23, 29, 37, 20);
      g.fillStyle(0xdc2626); g.fillTriangle(5, 24, 14, 10, 19, 25);
      g.fillTriangle(30, 23, 41, 8, 43, 29);
      g.fillStyle(0xfbbf24); g.fillTriangle(12, 21, 19, 3, 24, 22);
      g.fillTriangle(22, 20, 29, 2, 34, 23);
      g.fillStyle(0xfef08a); g.fillCircle(14, 27, 3); g.fillCircle(34, 27, 3);
      g.fillStyle(0x451a03); g.fillRect(9, 35, 8, 9); g.fillRect(31, 35, 8, 9);
      break;
    case 'mage': // Cinder Warlock: horned robe holding a fire orb.
      g.fillStyle(0x450a0a); g.fillTriangle(24, 8, 6, 43, 42, 43);
      g.fillStyle(0x991b1b); g.fillCircle(24, 18, 12);
      g.fillStyle(0x111827); g.fillEllipse(24, 19, 15, 13);
      g.fillStyle(0xfef08a); g.fillCircle(20, 18, 2); g.fillCircle(28, 18, 2);
      g.fillStyle(0xf97316); g.fillTriangle(15, 12, 10, 1, 21, 10); g.fillTriangle(27, 10, 38, 1, 33, 13);
      g.fillStyle(0xfbbf24, .95); g.fillCircle(42, 29, 7); g.fillStyle(0xfffbeb); g.fillCircle(42, 29, 3);
      break;
    case 'tank': // Magma Bulwark: cracked lava armor.
      g.fillStyle(0x1c1917); g.fillRoundedRect(5, 10, 38, 34, 7);
      g.fillStyle(0x57534e); g.fillRoundedRect(1, 20, 14, 21, 4); g.fillRoundedRect(34, 20, 13, 21, 4);
      g.lineStyle(3, 0xf97316); g.lineBetween(14, 13, 23, 25); g.lineBetween(23, 25, 18, 40);
      g.lineBetween(34, 12, 28, 24); g.lineBetween(28, 24, 35, 37);
      g.fillStyle(0xfde047); g.fillRect(15, 20, 6, 3); g.fillRect(28, 20, 6, 3);
      break;
    case 'bomber': // Bombardier Imp: horned imp carrying a lit bomb.
      g.fillStyle(0x9f1239); g.fillRoundedRect(9, 18, 28, 24, 8);
      g.fillStyle(0x4c0519); g.fillTriangle(11, 21, 5, 5, 20, 16); g.fillTriangle(29, 16, 43, 5, 37, 23);
      g.fillStyle(0xfef08a); g.fillCircle(17, 25, 3); g.fillCircle(29, 25, 3);
      g.fillStyle(0x1c1917); g.fillCircle(40, 35, 10);
      g.lineStyle(2, 0xfbbf24); g.lineBetween(39, 25, 44, 17);
      g.fillStyle(0xf97316); g.fillCircle(45, 15, 4);
      break;
    default: break;
  }
  worldMark(g, look.worldId, 0xffedd5, 24, 12);
}

function drawBoss(g: Phaser.GameObjects.Graphics, look: CharacterLook, tier: number): void {
  if (look.worldId === 3) {
    drawEmberBoss(g, tier);
    return;
  }
  // Distinct silhouettes for the six encounters, including both room-15 bosses.
  g.fillStyle(0x020617, 0.7); g.fillEllipse(24, 44, 40, 7);
  g.fillStyle(look.secondary); g.fillRoundedRect(6, 16, 36, 28, 8);
  g.fillStyle(look.primary); g.fillRoundedRect(10, 17, 28, 23, 6);
  g.fillStyle(0x0b1225); g.fillRoundedRect(16, 24, 16, 10, 2);
  g.fillStyle(0xfef3c7); g.fillRect(18, 27, 5, 3); g.fillRect(26, 27, 5, 3);
  const horns = 2 + tier % 4;
  for (let i = 0; i < horns; i++) {
    const x = 8 + i * 32 / (horns - 1);
    const spikeHeight = 8 + ((tier + i) % 3) * 4;
    g.fillStyle(i % 2 ? look.secondary : look.primary);
    g.fillTriangle(x - 4, 18, x, 18 - spikeHeight, x + 4, 18);
  }
  if (tier % 2 === 0) {
    g.fillStyle(look.glow);
    g.fillTriangle(0, 30, 12, 20, 11, 39);
    g.fillTriangle(48, 30, 36, 20, 37, 39);
  } else {
    g.lineStyle(3, look.glow); g.strokeCircle(24, 18, 11 + tier % 4);
  }
  if (tier >= 6) {
    g.lineStyle(2, 0xffffff, 0.85);
    g.lineBetween(4, 32, 12, 40);
    g.lineBetween(44, 32, 36, 40);
  }
  worldMark(g, look.worldId, 0xf8fafc, 24, 38);
}

/** Unique World-3 boss silhouettes keyed by their retained archetype texture index. */
function drawEmberBoss(g: Phaser.GameObjects.Graphics, tier: number): void {
  g.fillStyle(0x130707, 0.82); g.fillEllipse(24, 44, 44, 7);
  if (tier === 1) { // Helios Spinner
    g.fillStyle(0x7c2d12); g.fillCircle(24, 25, 17);
    g.lineStyle(5, 0xf97316); g.strokeCircle(24, 25, 13);
    g.lineStyle(4, 0xfbbf24);
    g.lineBetween(2, 25, 46, 25); g.lineBetween(24, 3, 24, 47);
    g.fillStyle(0xfef08a); g.fillCircle(24, 25, 6);
  } else if (tier === 3) { // Cinder Mortar
    g.fillStyle(0x292524); g.fillRoundedRect(7, 16, 35, 28, 8);
    g.fillStyle(0x9a3412); g.fillCircle(24, 20, 14);
    g.fillStyle(0x451a03); g.fillRoundedRect(18, 1, 12, 25, 5);
    g.fillStyle(0xf97316); g.fillCircle(24, 7, 5);
    g.fillStyle(0xfef3c7); g.fillRect(14, 27, 7, 3); g.fillRect(28, 27, 7, 3);
  } else if (tier === 5) { // Furnace Artillerist
    g.fillStyle(0x44403c); g.fillRoundedRect(7, 15, 34, 29, 6);
    g.fillStyle(0x7c2d12); g.fillCircle(24, 24, 12);
    g.fillStyle(0x1c1917); g.fillRect(0, 16, 17, 8); g.fillRect(32, 16, 16, 8);
    g.fillStyle(0xfbbf24); g.fillCircle(8, 20, 4); g.fillCircle(40, 20, 4);
    g.fillStyle(0xffedd5); g.fillRect(18, 26, 5, 3); g.fillRect(27, 26, 5, 3);
  } else if (tier === 4) { // Pentaflare Sentinel
    g.fillStyle(0x450a0a); g.fillTriangle(24, 2, 3, 43, 45, 43);
    g.fillStyle(0x991b1b); g.fillCircle(24, 23, 14);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      g.fillStyle(i % 2 ? 0xf97316 : 0xfbbf24);
      g.fillCircle(24 + Math.cos(a) * 18, 23 + Math.sin(a) * 18, 4);
    }
    g.fillStyle(0xfef08a); g.fillCircle(24, 23, 5);
  } else if (tier === 7) { // Lava Broodmother
    g.fillStyle(0x431407); g.fillEllipse(24, 28, 39, 29);
    g.fillStyle(0xb91c1c); g.fillEllipse(24, 25, 28, 22);
    g.lineStyle(4, 0x7f1d1d);
    for (const y of [25, 35]) { g.lineBetween(9, y, 1, y + 7); g.lineBetween(39, y, 47, y + 7); }
    g.fillStyle(0xfde047); g.fillCircle(17, 24, 3); g.fillCircle(31, 24, 3);
    g.fillStyle(0xf97316); g.fillCircle(24, 35, 7);
  } else if (tier === 8) { // Caldera Queen
    g.fillStyle(0x3f3f46); g.fillTriangle(24, 4, 4, 44, 44, 44);
    g.fillStyle(0x9a3412); g.fillCircle(24, 23, 14);
    g.fillStyle(0xf97316); g.fillTriangle(7, 16, 12, 1, 18, 17);
    g.fillTriangle(18, 15, 24, -1, 30, 15); g.fillTriangle(30, 17, 37, 1, 42, 18);
    g.lineStyle(3, 0xfbbf24); g.lineBetween(14, 31, 24, 22); g.lineBetween(24, 22, 34, 34);
    g.fillStyle(0xfffbeb); g.fillCircle(19, 22, 2); g.fillCircle(29, 22, 2);
  } else { // Heart of Inferno
    g.fillStyle(0x1c1917); g.fillRoundedRect(4, 11, 40, 34, 8);
    g.fillStyle(0x7f1d1d); g.fillCircle(24, 27, 17);
    g.lineStyle(4, 0xf97316); g.strokeCircle(24, 27, 13);
    g.fillStyle(0xfde047); g.fillCircle(24, 27, 7);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.fillStyle(i % 2 ? 0xdc2626 : 0xf97316);
      g.fillTriangle(24 + Math.cos(a) * 15, 27 + Math.sin(a) * 15,
        24 + Math.cos(a - .16) * 28, 27 + Math.sin(a - .16) * 28,
        24 + Math.cos(a + .16) * 28, 27 + Math.sin(a + .16) * 28);
    }
  }
}

/** One pre-rendered texture per minion and encountered boss. */
export function createWorldCharacterTextures(scene: Phaser.Scene): void {
  for (const world of WORLDS) {
    const roster = [
      ...getWorldCharacterRoster(world.id),
      ...getWorldBossArtRoster(world.id),
    ];
    for (const look of roster) {
      if (scene.textures.exists(look.textureKey)) continue;
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      if (look.kind === 'boss') {
        drawBoss(g, look, Number(look.textureKey.split('-').at(-1)));
      } else {
        drawMinion(g, look);
      }
      g.generateTexture(look.textureKey, 48, 48);
      g.destroy();
    }
  }
}

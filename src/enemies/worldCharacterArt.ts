import Phaser from 'phaser';
import { WORLDS, type WorldId } from '../worlds/worldConfig';
import { BOSS_ENCOUNTER_ARCHETYPES } from './bossProfiles';
import { getWorldCharacter, getWorldCharacterRoster, type CharacterLook } from './worldCharacters';

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

function drawBoss(g: Phaser.GameObjects.Graphics, look: CharacterLook, tier: number): void {
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

/** One pre-rendered texture per minion and encountered boss. */
export function createWorldCharacterTextures(scene: Phaser.Scene): void {
  for (const world of WORLDS) {
    const roster = [
      ...getWorldCharacterRoster(world.id),
      ...Object.entries(BOSS_ENCOUNTER_ARCHETYPES).flatMap(([room, indices]) =>
        indices.map((_, slot) => getWorldCharacter(world.id, 'boss', Number(room), slot))),
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

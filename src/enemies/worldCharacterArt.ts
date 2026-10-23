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
      if (look.worldId === 1) {
        drawGoblinScout(g);
        break;
      }
      g.fillStyle(look.primary);
      g.fillRoundedRect(6, 18, 36, 24, 10);
      g.fillCircle(16, 22, 9); g.fillCircle(32, 23, 9);
      g.fillStyle(0x081b22); g.fillCircle(17, 27, 3); g.fillCircle(31, 27, 3);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(18, 26, 1.2); g.fillCircle(32, 26, 1.2);
      worldMark(g, look.worldId, 0xeaffce, 24, 15);
      break;
    case 'archer':
      if (look.worldId === 1) {
        drawBriarArcher(g);
        break;
      }
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
      if (look.worldId === 1) {
        drawForestRollerGolem(g, false);
        break;
      }
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

/** Forest archer body. The bow, arrow and drawing arms are intentionally not
 * baked into this texture: AdvancedEnemy renders and animates those parts. */
function drawBriarArcher(g: Phaser.GameObjects.Graphics): void {
  // Boots, slim legs and a split leather tunic make this a humanoid archer.
  g.fillStyle(0x2d2118); g.fillRoundedRect(13, 35, 8, 10, 2);
  g.fillRoundedRect(28, 35, 8, 10, 2);
  g.fillStyle(0x69452a); g.fillRoundedRect(11, 41, 12, 4, 2);
  g.fillRoundedRect(27, 41, 12, 4, 2);
  g.fillStyle(0x38562b); g.fillRoundedRect(13, 20, 23, 21, 5);
  g.fillStyle(0x6e8f3d); g.fillTriangle(14, 31, 24, 42, 25, 29);
  g.fillTriangle(35, 31, 25, 42, 24, 29);
  g.fillStyle(0x493322); g.fillRoundedRect(12, 30, 25, 5, 2);
  g.fillStyle(0xc7a45c); g.fillRoundedRect(22, 30, 6, 5, 1);
  // Quiver and visible arrow feathers behind the shoulder.
  g.fillStyle(0x4b2f1f); g.fillRoundedRect(8, 14, 7, 24, 3);
  g.lineStyle(2, 0xb9874b); g.lineBetween(10, 20, 6, 3);
  g.lineBetween(13, 20, 12, 2);
  g.fillStyle(0xd7e6b0); g.fillTriangle(4, 3, 8, 3, 6, 8);
  g.fillTriangle(10, 2, 14, 2, 12, 7);
  // Pointed hood, face opening, alert eyes and leaf clasp.
  g.fillStyle(0x274426); g.fillTriangle(24, 3, 8, 25, 41, 25);
  g.fillStyle(0x416d32); g.fillRoundedRect(11, 12, 28, 18, 8);
  g.fillStyle(0x162318); g.fillEllipse(25, 21, 19, 14);
  g.fillStyle(0xd9ef9a); g.fillRoundedRect(16, 19, 7, 3, 1);
  g.fillRoundedRect(28, 19, 7, 3, 1);
  g.fillStyle(0x233319); g.fillRect(20, 19, 2, 3); g.fillRect(29, 19, 2, 3);
  g.fillStyle(0x86b94c); g.fillTriangle(23, 11, 30, 7, 28, 15);
  g.fillStyle(0xcfe986); g.fillCircle(24, 27, 3);
  // Shoulders stop short of the hands so the animated arms stay readable.
  g.fillStyle(0x587f37); g.fillCircle(13, 26, 5); g.fillCircle(37, 26, 5);
}

/** The World-1 charger and first boss are one readable creature family:
 * stacked forest stones, moss seams and heavy folding limbs. The boss is
 * deliberately more detailed; runtime scale makes it substantially larger. */
function drawForestRollerGolem(g: Phaser.GameObjects.Graphics, boss: boolean): void {
  const stone = boss ? 0x66705f : 0x727969;
  const lightStone = boss ? 0x929b82 : 0x969d86;
  const shadow = 0x343b33;
  const moss = boss ? 0x4f7a32 : 0x5f843b;
  const eye = boss ? 0xd9ff72 : 0xc8f36a;

  g.fillStyle(0x07130b, .62); g.fillEllipse(24, 44, boss ? 43 : 36, 7);
  // Heavy feet, fists and separated arms keep the idle silhouette humanoid.
  g.fillStyle(shadow);
  g.fillRoundedRect(boss ? 4 : 7, 31, boss ? 13 : 11, 12, 4);
  g.fillRoundedRect(boss ? 31 : 30, 31, boss ? 13 : 11, 12, 4);
  g.fillRoundedRect(boss ? 1 : 4, 21, boss ? 13 : 11, 17, 5);
  g.fillRoundedRect(boss ? 34 : 33, 21, boss ? 13 : 11, 17, 5);
  g.fillStyle(stone);
  g.fillRoundedRect(boss ? 7 : 10, boss ? 14 : 16, boss ? 34 : 28, boss ? 27 : 25, 8);
  g.fillStyle(lightStone);
  g.fillRoundedRect(boss ? 10 : 13, boss ? 8 : 11, boss ? 28 : 22, boss ? 20 : 17, 7);
  // Brow, recessed face and bright magical eyes remain readable on phones.
  g.fillStyle(shadow); g.fillRoundedRect(boss ? 12 : 15, boss ? 16 : 18,
    boss ? 24 : 18, boss ? 11 : 9, 3);
  g.fillStyle(eye); g.fillRoundedRect(boss ? 15 : 17, boss ? 19 : 20, 6, 3, 1);
  g.fillRoundedRect(boss ? 27 : 26, boss ? 19 : 20, 6, 3, 1);
  // Cracks show that the limbs can fold together into the rolling boulder.
  g.lineStyle(boss ? 2.4 : 1.8, 0x252b25, .92);
  g.lineBetween(13, 29, 20, 34); g.lineBetween(20, 34, 17, 41);
  g.lineBetween(35, 28, 28, 33); g.lineBetween(28, 33, 32, 40);
  g.lineBetween(18, 11, 22, 16); g.lineBetween(31, 10, 27, 16);
  // Moss grows over the shoulder plates; the boss also carries small stones.
  g.fillStyle(moss);
  g.fillEllipse(boss ? 11 : 14, boss ? 16 : 18, boss ? 17 : 13, 7);
  g.fillEllipse(boss ? 35 : 33, boss ? 14 : 17, boss ? 15 : 12, 6);
  g.fillTriangle(18, 12, 22, 3, 25, 13);
  if (boss) {
    g.fillStyle(0x7e8876); g.fillTriangle(6, 20, 9, 5, 16, 18);
    g.fillTriangle(33, 17, 40, 4, 43, 21);
    g.fillStyle(0xb6c89b); g.fillCircle(8, 26, 3); g.fillCircle(41, 27, 3);
  }
}

/** Dedicated curled pose used after the visible crouch. It is intentionally a
 * near-perfect circle, so rotation reads as rolling instead of a sliding dash. */
function drawForestRollerBall(g: Phaser.GameObjects.Graphics, boss: boolean): void {
  const radius = boss ? 21 : 18;
  const stone = boss ? 0x626c5b : 0x747b6b;
  const lightStone = boss ? 0x919b82 : 0x9ba28b;
  const moss = boss ? 0x4e7a31 : 0x5d843a;
  g.fillStyle(0x07130b, .55); g.fillEllipse(24, 44, boss ? 43 : 36, 6);
  g.fillStyle(0x30372f); g.fillCircle(24, 25, radius + 1);
  g.fillStyle(stone); g.fillCircle(24, 24, radius);
  // Interlocking plates make the rotation obvious even at high dash speed.
  g.fillStyle(lightStone); g.fillTriangle(24, 4, 34, 17, 22, 20);
  g.fillTriangle(43, 24, 31, 34, 29, 21);
  g.fillStyle(0x454e42); g.fillTriangle(24, 44, 14, 33, 26, 29);
  g.fillTriangle(5, 24, 17, 14, 20, 27);
  g.lineStyle(boss ? 2.6 : 2, 0x272e27, .95);
  g.strokeCircle(24, 24, radius - 1);
  g.lineBetween(24, 5, 22, 20); g.lineBetween(42, 24, 29, 21);
  g.lineBetween(24, 43, 26, 29); g.lineBetween(6, 24, 20, 27);
  g.fillStyle(moss); g.fillEllipse(14, 12, boss ? 13 : 10, 5);
  g.fillEllipse(36, 31, boss ? 12 : 9, 5);
  // A brief glimpse of the tucked-in glowing face sells the transformation.
  g.fillStyle(0x252b25); g.fillRoundedRect(16, 20, 16, 8, 3);
  g.fillStyle(boss ? 0xd9ff72 : 0xc8f36a);
  g.fillRect(18, 22, 4, 2); g.fillRect(27, 22, 4, 2);
}

/** 48x48 forest goblin: pointed ears, green face, snarling teeth,
 * patched leather tunic, hand wraps, brown boots and a metal belt buckle.
 * Its steel knife is drawn separately by Slime, because it must physically
 * swing instead of being permanently stamped into the sprite. */
function drawGoblinScout(g: Phaser.GameObjects.Graphics): void {
  // Floor shadow and two separated boots make the silhouette clearly bipedal.
  g.fillStyle(0x07130b, .55); g.fillEllipse(24, 43, 35, 7);
  g.fillStyle(0x332317); g.fillRoundedRect(12, 36, 9, 9, 3);
  g.fillRoundedRect(29, 36, 9, 9, 3);
  g.fillStyle(0x7c5431); g.fillRoundedRect(12, 41, 11, 4, 2);
  g.fillRoundedRect(27, 41, 12, 4, 2);
  // Wide angular arms and a rugged leather vest, not a spherical slime.
  g.fillStyle(0x39771e); g.fillRoundedRect(8, 23, 9, 16, 4);
  g.fillRoundedRect(34, 23, 8, 16, 4);
  g.fillStyle(0x364427); g.fillRoundedRect(16, 20, 19, 22, 5);
  g.fillStyle(0x75422b); g.fillRoundedRect(17, 22, 17, 19, 3);
  g.fillStyle(0x9b6744); g.fillTriangle(18, 24, 24, 29, 18, 34);
  g.fillStyle(0x4a3124); g.fillRoundedRect(17, 32, 18, 5, 1);
  g.fillStyle(0xe3b45b); g.fillRoundedRect(23, 32, 6, 5, 1);
  g.fillStyle(0x302719); g.fillRoundedRect(25, 33, 2, 3, 1);
  // Green shoulders/neck, then giant spear-point ears read at phone size.
  g.fillStyle(0x5d9b2a);
  g.fillTriangle(13, 13, 0, 7, 13, 24);
  g.fillTriangle(36, 13, 48, 7, 36, 24);
  g.fillStyle(0x9b5c45);
  g.fillTriangle(10, 15, 3, 10, 13, 22);
  g.fillTriangle(39, 15, 45, 10, 36, 22);
  // Squared green head, dark hair/hood and chin to avoid slime appearance.
  g.fillStyle(0x294d1b); g.fillEllipse(24, 13, 28, 19);
  g.fillStyle(0x75bb3c); g.fillRoundedRect(10, 13, 29, 18, 7);
  g.fillStyle(0xa2d653); g.fillRoundedRect(13, 18, 23, 10, 5);
  g.fillStyle(0x335722); g.fillTriangle(12, 16, 18, 7, 23, 14);
  g.fillTriangle(18, 10, 27, 5, 32, 13);
  g.fillTriangle(27, 8, 38, 13, 35, 18);
  // Angry golden eyes and heavy brow.
  g.fillStyle(0x253719); g.fillRoundedRect(14, 17, 10, 6, 2);
  g.fillRoundedRect(27, 17, 10, 6, 2);
  g.fillStyle(0xffd76a); g.fillRoundedRect(17, 19, 5, 3, 1);
  g.fillRoundedRect(29, 19, 5, 3, 1);
  g.fillStyle(0x1b2815); g.fillRect(20, 19, 2, 3); g.fillRect(29, 19, 2, 3);
  g.lineStyle(2.5, 0x27431c); g.lineBetween(13, 17, 23, 18);
  g.lineBetween(28, 18, 38, 16);
  // Hooked nose, jagged mouth, two ivory fangs.
  g.fillStyle(0x548f26); g.fillTriangle(25, 20, 21, 27, 29, 26);
  g.fillStyle(0x26321b); g.fillRoundedRect(19, 27, 14, 4, 1);
  g.fillStyle(0xffefc0); g.fillTriangle(20, 27, 23, 27, 22, 31);
  g.fillTriangle(29, 27, 32, 27, 30, 31);
  // A raised leather wrist is left clear for the animated knife overlay.
  g.fillStyle(0x4e8d26); g.fillCircle(38, 31, 4);
  g.lineStyle(2, 0xc38a57); g.lineBetween(37, 33, 41, 34);
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
  if (look.worldId === 1 && tier === 1) {
    drawForestRollerGolem(g, true);
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
  const rollerTextures = [
    { key: 'world-1-charger-roll', boss: false },
    { key: 'world-1-boss-1-roll', boss: true },
  ] as const;
  for (const roller of rollerTextures) {
    if (scene.textures.exists(roller.key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawForestRollerBall(g, roller.boss);
    g.generateTexture(roller.key, 48, 48);
    g.destroy();
  }
}

import Phaser from 'phaser';
import { HERO_IDS, HEROES, type HeroId } from './heroConfig';

/** Humanoid side/top-down base, facing right so sprite rotation follows aim. */
function body(g: Phaser.GameObjects.Graphics, armor: number, cloth: number, skin = 0xf2c9a5): void {
  g.fillStyle(0x020617, 0.35); g.fillEllipse(30, 39, 51, 24);
  // Two separated legs and boots.
  g.fillStyle(cloth); g.fillRoundedRect(8, 19, 23, 9, 4); g.fillRoundedRect(8, 38, 23, 9, 4);
  g.fillStyle(0x111827); g.fillRoundedRect(5, 19, 10, 9, 3); g.fillRoundedRect(5, 38, 10, 9, 3);
  // Torso, shoulder and arms.
  g.fillStyle(armor); g.fillRoundedRect(22, 15, 27, 36, 8);
  g.fillStyle(cloth); g.fillRoundedRect(28, 9, 18, 8, 4); g.fillRoundedRect(28, 49, 18, 8, 4);
  g.fillStyle(skin); g.fillCircle(48, 33, 10);
  g.fillStyle(0xf8fafc); g.fillCircle(54, 30, 2);
  g.fillStyle(0x0f172a); g.fillCircle(55, 30, 1);
  g.lineStyle(2, 0xe2e8f0, 0.65); g.strokeRoundedRect(22, 15, 27, 36, 8);
}

/** A proper Robin Hood silhouette: feathered cap, forest tunic, leather belt,
 * bracers, boots, quiver and short cloak. The live bow remains in the attack layer. */
function drawRobinHoodRanger(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x020b07, .4); g.fillEllipse(30, 40, 52, 23);
  // Split forest cloak behind the body.
  g.fillStyle(0x173d24); g.fillTriangle(8, 12, 4, 57, 35, 44);
  g.fillStyle(0x285b32); g.fillTriangle(12, 16, 9, 52, 31, 40);
  // Boots, leggings and the belted green tunic.
  g.fillStyle(0x4b2f20); g.fillRoundedRect(5, 18, 16, 10, 4);
  g.fillRoundedRect(5, 39, 16, 10, 4);
  g.fillStyle(0x806044); g.fillRoundedRect(8, 19, 15, 7, 3);
  g.fillRoundedRect(8, 41, 15, 7, 3);
  g.fillStyle(0x315f32); g.fillRoundedRect(19, 14, 29, 38, 8);
  g.fillStyle(0x4e8a43); g.fillTriangle(22, 45, 34, 57, 36, 44);
  g.fillStyle(0x244b2b); g.fillTriangle(35, 44, 43, 55, 46, 42);
  g.fillStyle(0x6d4528); g.fillRoundedRect(20, 29, 29, 6, 2);
  g.fillStyle(0xd5ad55); g.fillRoundedRect(32, 29, 7, 6, 1);
  // Quiver behind the lower shoulder, with three individually visible arrows.
  g.fillStyle(0x51311f); g.fillRoundedRect(17, 43, 22, 8, 3);
  for (const x of [12, 16, 20]) {
    g.lineStyle(2, 0xb47a3f, 1); g.lineBetween(x, 48, x - 7, 57);
    g.fillStyle(x === 16 ? 0xd7e8a5 : 0xb9d47e);
    g.fillTriangle(x - 7, 57, x - 2, 54, x - 4, 60);
  }
  // Leather sleeves/bracer leave the weapon hand at the live bow attachment.
  g.fillStyle(0x3d7138); g.fillRoundedRect(31, 10, 17, 10, 5);
  g.fillStyle(0x71482d); g.fillRoundedRect(42, 11, 11, 8, 3);
  g.lineStyle(1.5, 0xc18b52); g.lineBetween(45, 12, 48, 18);
  // Face, brown hair and the classic pointed cap with a pale feather.
  g.fillStyle(0x8a5434); g.fillEllipse(48, 33, 20, 23);
  g.fillStyle(0xf0c49a); g.fillRoundedRect(42, 25, 17, 18, 7);
  g.fillStyle(0x694129); g.fillTriangle(41, 27, 47, 20, 54, 26);
  g.fillTriangle(43, 39, 48, 44, 51, 39);
  g.fillStyle(0xf8fafc); g.fillCircle(56, 31, 2.2);
  g.fillStyle(0x1e293b); g.fillCircle(57, 31, 1);
  g.fillStyle(0x2f6b35); g.fillTriangle(35, 24, 48, 15, 61, 25);
  g.fillRoundedRect(38, 23, 24, 5, 2);
  g.lineStyle(3, 0xf1e7b8); g.lineBetween(44, 19, 34, 7);
  g.lineStyle(1.3, 0xb8c98b); g.lineBetween(42, 17, 34, 7);
  g.lineBetween(39, 14, 34, 7);
}

/** Heavy but heroic Guardian: layered steel plate, gold trim, crimson cape,
 * full helm and a proportional kite shield on the non-weapon arm. */
function drawGuardianKnight(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x020617, .42); g.fillEllipse(30, 40, 54, 24);
  g.fillStyle(0x7f1d1d); g.fillTriangle(8, 11, 4, 57, 37, 45);
  g.fillStyle(0xb91c1c); g.fillTriangle(11, 16, 9, 51, 31, 42);
  // Sabatons and leg plate.
  g.fillStyle(0x26384b); g.fillRoundedRect(4, 18, 19, 11, 4);
  g.fillRoundedRect(4, 39, 19, 11, 4);
  g.fillStyle(0x8da1b5); g.fillRoundedRect(8, 19, 16, 7, 3);
  g.fillRoundedRect(8, 42, 16, 7, 3);
  // Broad breastplate and separate pauldrons.
  g.fillStyle(0x334a60); g.fillRoundedRect(19, 13, 31, 39, 9);
  g.fillStyle(0x7890a4); g.fillRoundedRect(23, 16, 23, 32, 6);
  g.fillStyle(0x25384b); g.fillRoundedRect(28, 21, 17, 23, 4);
  g.lineStyle(2.5, 0xf1c75b); g.strokeRoundedRect(23, 16, 23, 32, 6);
  g.lineBetween(27, 31, 45, 31); g.lineBetween(35, 17, 35, 47);
  g.fillStyle(0xf5cf63); g.fillCircle(35, 31, 4);
  g.fillStyle(0x516a80); g.fillCircle(33, 13, 10); g.fillCircle(34, 51, 10);
  g.lineStyle(2, 0xe5bd55); g.strokeCircle(33, 13, 9); g.strokeCircle(34, 51, 9);
  // Weapon-side gauntlet ends where the animated sword/hammer hand begins.
  g.fillStyle(0x60788e); g.fillRoundedRect(39, 8, 15, 10, 4);
  g.fillStyle(0xb8c5d1); g.fillRoundedRect(48, 10, 8, 7, 3);
  // Full helmet, bright visor and short knight plume.
  g.fillStyle(0x25384a); g.fillRoundedRect(40, 21, 21, 25, 8);
  g.fillStyle(0x8194a6); g.fillRoundedRect(43, 23, 16, 20, 6);
  g.fillStyle(0x182738); g.fillRoundedRect(46, 27, 15, 8, 2);
  g.lineStyle(2.5, 0xf3cf68); g.lineBetween(47, 31, 61, 31);
  g.fillStyle(0xffefad); g.fillRect(54, 29, 6, 3);
  g.fillStyle(0xb91c1c); g.fillTriangle(45, 23, 49, 10, 54, 23);
  // Off-hand kite shield, smaller than the body but unmistakably equipped.
  const shield = [new Phaser.Math.Vector2(28, 43), new Phaser.Math.Vector2(43, 40),
    new Phaser.Math.Vector2(47, 51), new Phaser.Math.Vector2(36, 61),
    new Phaser.Math.Vector2(25, 52)];
  g.fillStyle(0x26394d); g.fillPoints(shield, true);
  g.lineStyle(2.8, 0xf2cc62); g.strokePoints(shield, true);
  g.fillStyle(0xb91c1c); g.fillTriangle(30, 46, 42, 44, 36, 56);
  g.fillStyle(0xf7d66e); g.fillCircle(36, 49, 3.2);
}

function heroShape(g: Phaser.GameObjects.Graphics, id: HeroId, color: number): void {
  switch (id) {
    case 'ranger':
      drawRobinHoodRanger(g);
      break;
    case 'mage':
      g.fillStyle(0x4c1d95); g.fillTriangle(8, 9, 4, 58, 42, 38);
      body(g, color, 0x6b21a8);
      g.fillStyle(color); g.fillTriangle(37, 20, 48, 1, 59, 25); // hat
      // The long crystal staff is now carried and physically swung by the
      // foreground arm. Do not stamp a second motionless staff on the body.
      break;
    case 'guardian':
      drawGuardianKnight(g);
      break;
    case 'frostblade':
      g.fillStyle(0x0c4a6e); g.fillTriangle(9, 7, 4, 57, 40, 36);
      body(g, color, 0x0369a1);
      g.fillStyle(0xe0f2fe); g.fillTriangle(40, 21, 46, 6, 51, 22);
      g.fillTriangle(47, 20, 55, 7, 58, 25); // ice crown
      // Keep the crown: icy daggers and the wave are now conjured by moving
      // hands instead of showing permanently welded swords in both arms.
      break;
    case 'pyromancer':
      g.fillStyle(0x7c2d12); g.fillTriangle(10, 5, 5, 59, 43, 36);
      body(g, color, 0x9a3412);
      g.fillStyle(0xef4444); g.fillTriangle(39, 23, 48, 3, 58, 25);
      g.fillStyle(0xfef08a); g.fillCircle(38, 10, 6); g.fillCircle(39, 55, 6);
      g.fillStyle(0xfb923c); g.fillTriangle(34, 10, 40, 0, 44, 12);
      g.fillTriangle(35, 55, 41, 44, 45, 58);
      break;
    case 'stormstrider':
      g.fillStyle(0x1e3a8a); g.fillTriangle(13, 12, 1, 20, 18, 31);
      g.fillTriangle(13, 52, 1, 44, 18, 33); // winged cloak
      body(g, color, 0x1d4ed8);
      g.fillStyle(0xfef9c3); g.fillTriangle(40, 18, 49, 3, 57, 23);
      // Tempest Spear now moves with the hands in its attack renderer.
      g.lineStyle(3, 0xffffff); g.lineBetween(25, 6, 32, 15);
      g.lineBetween(32, 15, 27, 20);
      break;
    case 'voidwalker':
      g.fillStyle(0x3b0764); g.fillTriangle(12, 4, 3, 60, 48, 37);
      body(g, color, 0x581c87, 0xc4a0b5);
      g.fillStyle(0x160c2e); g.fillRoundedRect(39, 21, 20, 25, 9);
      g.fillStyle(0xf5d0fe); g.fillCircle(54, 31, 4);
      // The Shadow Scythe's crescent and shaft are animated independently.
      break;
  }
}

export function createHeroArt(scene: Phaser.Scene): void {
  for (const id of HERO_IDS) {
    const hero = HEROES[id];
    if (scene.textures.exists(hero.textureKey)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    heroShape(g, id, hero.color);
    g.generateTexture(hero.textureKey, 64, 64);
    g.destroy();
  }
}

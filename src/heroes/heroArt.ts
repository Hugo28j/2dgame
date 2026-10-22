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

function heroShape(g: Phaser.GameObjects.Graphics, id: HeroId, color: number): void {
  switch (id) {
    case 'ranger':
      g.fillStyle(0x164e63); g.fillTriangle(13, 8, 7, 55, 38, 34); // cloak
      body(g, color, 0x155e75);
      g.fillStyle(color); g.fillTriangle(38, 10, 58, 22, 42, 39); // hood
      // The equipped bow/crossbow is now physically drawn and animated in combat.
      // Keep the hood but remove the duplicate baked-in bow and arrow.
      break;
    case 'mage':
      g.fillStyle(0x4c1d95); g.fillTriangle(8, 9, 4, 58, 42, 38);
      body(g, color, 0x6b21a8);
      g.fillStyle(color); g.fillTriangle(37, 20, 48, 1, 59, 25); // hat
      g.lineStyle(3, 0xd8b4fe); g.lineBetween(38, 53, 60, 8);
      g.fillStyle(0xf5d0fe); g.fillCircle(60, 8, 5); g.fillStyle(0xffffff); g.fillCircle(60, 8, 2);
      break;
    case 'guardian':
      body(g, 0xb45309, color);
      g.fillStyle(0x475569); g.fillRoundedRect(37, 20, 20, 24, 7); // helmet
      g.fillStyle(0xfde68a); g.fillRect(48, 27, 10, 4);
      g.fillStyle(color); g.fillRoundedRect(27, 11, 15, 42, 5); // plate
      g.fillStyle(0x334155); g.fillCircle(35, 52, 12); // shield
      g.lineStyle(3, 0xf8fafc); g.strokeCircle(35, 52, 11);
      // Sword and hammer are now held by an independently animated foreground arm.
      break;
    case 'frostblade':
      g.fillStyle(0x0c4a6e); g.fillTriangle(9, 7, 4, 57, 40, 36);
      body(g, color, 0x0369a1);
      g.fillStyle(0xe0f2fe); g.fillTriangle(40, 21, 46, 6, 51, 22);
      g.fillTriangle(47, 20, 55, 7, 58, 25); // ice crown
      g.lineStyle(4, 0xe0f2fe); g.lineBetween(40, 13, 61, 3);
      g.lineBetween(42, 52, 62, 61);
      g.fillStyle(0x7dd3fc); g.fillTriangle(58, 0, 64, 1, 60, 7);
      g.fillTriangle(59, 57, 64, 63, 57, 63);
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
      g.lineStyle(4, 0xfef08a); g.lineBetween(36, 54, 62, 8); // spear
      g.fillStyle(0xffffff); g.fillTriangle(58, 5, 64, 1, 63, 10);
      g.lineStyle(3, 0xffffff); g.lineBetween(25, 6, 32, 15);
      g.lineBetween(32, 15, 27, 20);
      break;
    case 'voidwalker':
      g.fillStyle(0x3b0764); g.fillTriangle(12, 4, 3, 60, 48, 37);
      body(g, color, 0x581c87, 0xc4a0b5);
      g.fillStyle(0x160c2e); g.fillRoundedRect(39, 21, 20, 25, 9);
      g.fillStyle(0xf5d0fe); g.fillCircle(54, 31, 4);
      g.lineStyle(4, 0xe9d5ff); g.beginPath(); g.arc(51, 34, 18, -1.2, 1.25); g.strokePath();
      g.lineStyle(3, 0x7e22ce); g.lineBetween(39, 53, 61, 13); // scythe
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

import Phaser from 'phaser';
import { HERO_IDS, HEROES, type HeroId } from './heroConfig';

/** Original, distinctive top-down hero avatars pre-rendered at boot. */
function heroShape(g: Phaser.GameObjects.Graphics, id: HeroId, color: number): void {
  g.fillStyle(0x08111f); g.fillCircle(24, 24, 22);
  g.lineStyle(2, 0xe2e8f0, 0.75); g.strokeCircle(24, 24, 21);

  switch (id) {
    case 'ranger': // Hood and longbow
      g.fillStyle(color); g.fillTriangle(24, 5, 7, 37, 41, 37);
      g.fillStyle(0x082435); g.fillEllipse(24, 26, 18, 15);
      g.fillStyle(0xe0f2fe); g.fillRect(19, 24, 5, 2); g.fillRect(27, 24, 5, 2);
      g.lineStyle(2, 0xfef08a); g.strokeCircle(40, 27, 7);
      break;
    case 'mage': // Floating wizard with an orb
      g.fillStyle(color); g.fillTriangle(24, 6, 11, 41, 37, 41);
      g.fillStyle(0x1e1b4b); g.fillCircle(24, 24, 12);
      g.fillStyle(0xf5d0fe); g.fillCircle(24, 24, 5);
      g.lineStyle(2, 0xffffff); g.strokeCircle(24, 24, 8);
      break;
    case 'guardian': // Helmet and shield
      g.fillStyle(color); g.fillRoundedRect(9, 12, 30, 29, 7);
      g.fillStyle(0x334155); g.fillRect(14, 18, 20, 12);
      g.fillStyle(0xfef9c3); g.fillRect(17, 23, 14, 3);
      g.lineStyle(2, 0xffffff); g.strokeCircle(35, 33, 8);
      break;
    case 'frostblade': // Ice crown and angular double blade
      g.fillStyle(color); g.fillTriangle(9, 13, 14, 2, 22, 14);
      g.fillTriangle(22, 14, 24, 0, 29, 14);
      g.fillTriangle(27, 14, 36, 2, 40, 15);
      g.fillRoundedRect(12, 14, 24, 27, 6);
      g.fillStyle(0x0c4a6e); g.fillRect(18, 21, 12, 6);
      g.lineStyle(3, 0xffffff); g.lineBetween(36, 13, 42, 38);
      g.fillStyle(0xe0f2fe); g.fillTriangle(34, 11, 39, 4, 41, 15);
      break;
    case 'pyromancer': // Flaming hood and two gauntlets
      g.fillStyle(color); g.fillTriangle(24, 0, 9, 28, 39, 28);
      g.fillTriangle(14, 14, 8, 37, 25, 24);
      g.fillTriangle(34, 14, 40, 37, 23, 24);
      g.fillStyle(0x7c2d12); g.fillRoundedRect(13, 21, 22, 21, 7);
      g.fillStyle(0xffedd5); g.fillRect(18, 27, 5, 3); g.fillRect(27, 27, 5, 3);
      g.fillStyle(0xfef08a); g.fillCircle(8, 36, 5); g.fillCircle(40, 36, 5);
      break;
    case 'stormstrider': // Winged lightning helmet
      g.fillStyle(color); g.fillRoundedRect(13, 14, 22, 29, 6);
      g.fillTriangle(12, 19, 0, 11, 5, 29);
      g.fillTriangle(36, 19, 48, 11, 43, 29);
      g.fillStyle(0x0f172a); g.fillRect(17, 23, 14, 7);
      g.fillStyle(0xfef9c3); g.fillRect(18, 26, 5, 2); g.fillRect(27, 26, 5, 2);
      g.lineStyle(3, 0xfffbeb); g.lineBetween(27, 3, 20, 15);
      g.lineBetween(20, 15, 29, 15);
      g.lineBetween(29, 15, 23, 21);
      break;
    case 'voidwalker': // Crescent halo, hollow eye, cape
      g.fillStyle(0x581c87); g.fillTriangle(24, 7, 3, 43, 45, 43);
      g.fillStyle(color); g.fillCircle(24, 23, 14);
      g.fillStyle(0x160c2e); g.fillEllipse(24, 26, 22, 16);
      g.fillStyle(0xf5d0fe); g.fillCircle(24, 26, 5);
      g.fillStyle(0x312050); g.fillCircle(26, 25, 3);
      g.lineStyle(3, 0xe9d5ff); g.strokeCircle(24, 12, 15);
      break;
  }
}

export function createHeroArt(scene: Phaser.Scene): void {
  for (const id of HERO_IDS) {
    const hero = HEROES[id];
    if (scene.textures.exists(hero.textureKey)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    heroShape(g, id, hero.color);
    g.generateTexture(hero.textureKey, 48, 48);
    g.destroy();
  }
}

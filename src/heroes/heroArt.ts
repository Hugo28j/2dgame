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

/** One organic Robin Hood silhouette built from the same forest cloth, yew,
 * leather, brass and pale-feather palette as both animated weapons. */
function drawRobinHoodRanger(g: Phaser.GameObjects.Graphics): void {
  const polygon = (coordinates: readonly (readonly [number, number])[]) =>
    coordinates.map(([x,y]) => new Phaser.Math.Vector2(x,y));
  g.fillStyle(0x020b07, .42); g.fillEllipse(30, 42, 54, 22);

  // A wind-swept two-layer cape creates a curved, agile silhouette.
  g.fillStyle(0x102f20, 1); g.fillPoints(polygon([
    [9,13],[19,17],[31,31],[25,49],[10,58],[13,43],[3,49],[8,31],
  ]),true);
  g.fillStyle(0x245b35, 1); g.fillPoints(polygon([
    [13,16],[24,20],[31,31],[23,43],[12,52],[16,37],[7,43],[12,28],
  ]),true);
  g.lineStyle(2,0x6f9a58,.7);g.lineBetween(14,18,11,48);

  // Diagonal quiver and matching real arrows sit behind the drawing shoulder.
  g.lineStyle(7,0x3b2417,1);g.lineBetween(12,43,27,19);
  g.lineStyle(4,0x865831,1);g.lineBetween(13,42,28,19);
  g.fillStyle(0x593720,1);g.fillEllipse(13,44,13,9);
  for(const offset of [-4,0,4]){
    g.lineStyle(2,0xb98545,1);g.lineBetween(14+offset,39,27+offset,16);
    g.fillStyle(offset===0?0xd4e5a4:0xa9c66d,1);
    g.fillTriangle(25+offset,18,31+offset,13,29+offset,21);
  }

  // Tapered leggings and turned leather boots; no rectangular block-body.
  g.fillStyle(0x243f2a,1);g.fillPoints(polygon([
    [17,25],[30,27],[27,34],[9,31],[5,26],[8,21],
  ]),true);
  g.fillPoints(polygon([[17,38],[30,36],[27,31],[9,34],[5,40],[8,45]]),true);
  g.fillStyle(0x4b2d1c,1);g.fillPoints(polygon([
    [5,21],[17,23],[18,29],[8,30],[2,27],
  ]),true);
  g.fillPoints(polygon([[5,45],[17,43],[18,37],[8,36],[2,40]]),true);
  g.lineStyle(2,0xa27542,.85);g.lineBetween(7,23,17,27);g.lineBetween(7,43,17,39);

  // Fitted tunic with pointed hem and soft shoulder shapes.
  g.fillStyle(0x2f6b3b,1);g.fillPoints(polygon([
    [19,16],[32,11],[45,17],[51,31],[46,46],[36,51],[29,46],[22,54],[17,43],[15,29],
  ]),true);
  g.fillStyle(0x46844a,1);g.fillPoints(polygon([
    [25,17],[36,14],[45,20],[46,39],[37,45],[29,42],[21,46],[20,27],
  ]),true);
  g.fillStyle(0x85a768,.65);g.fillEllipse(31,17,16,9);g.fillEllipse(32,46,18,9);
  g.lineStyle(2,0xb1c78b,.72);g.lineBetween(24,20,40,42);

  // Curved belt, brass leaf buckle and small utility pouch.
  g.lineStyle(7,0x5a3821,1);g.lineBetween(19,31,47,34);
  g.lineStyle(2,0xb47a3f,1);g.lineBetween(20,29,47,32);
  g.fillStyle(0xd0a64f,1);g.fillEllipse(34,33,8,7);
  g.fillStyle(0x51311f,1);g.fillEllipse(23,38,10,13);
  g.lineStyle(1.5,0xb98545,1);g.strokeEllipse(23,38,10,13);

  // The two shoulders sit on opposite edges of the tunic in true top-down view.
  // Keep the static sleeves short: the attacking arms are drawn separately
  // by CharacterAttackArt in front of this sprite.
  g.fillStyle(0x173a25,1);g.fillEllipse(35,14,18,12);g.fillEllipse(35,49,18,12);
  g.fillStyle(0x397b43,1);g.fillEllipse(37,14,15,9);g.fillEllipse(37,49,15,9);
  g.lineStyle(2,0x8cac69,.85);g.lineBetween(31,10,42,12);
  g.lineBetween(31,53,42,51);
  // Leather bracers stay alongside the body, rather than crossing the face.
  g.fillStyle(0x754b2d,1);g.fillRoundedRect(37,8,11,8,3);
  g.fillRoundedRect(37,49,11,8,3);
  g.lineStyle(1.6,0xc08a4f,.9);g.lineBetween(41,9,45,15);
  g.lineBetween(41,50,45,56);

  // Neck first, then a large, unmistakable head toward the facing direction.
  // The cap is BEHIND the visible face, not painted across its centre.
  g.fillStyle(0x40291a,1);g.fillEllipse(49,33,25,27); // hair/hood rim
  g.fillStyle(0x255d35,1);g.fillEllipse(46,31,24,27); // rounded hood crown
  g.fillStyle(0x78a362,1);g.fillEllipse(43,29,14,15); // cap highlight
  g.fillStyle(0xe9b98e,1);g.fillEllipse(53,33,18,19); // exposed face
  g.fillStyle(0xf6cba0,1);g.fillEllipse(56,32,11,13);
  g.fillStyle(0x38281c,1);g.fillEllipse(48,29,6,12); // sideburn/hair
  // Directional forehead, bright eye and tiny nose read even at mobile size.
  g.fillStyle(0xffffff,1);g.fillCircle(58,29,2.4);
  g.fillStyle(0x15231a,1);g.fillCircle(59,29,1.25);
  g.fillStyle(0xe0a477,1);g.fillTriangle(63,33,59,31,59,35);
  g.lineStyle(1.5,0x965b3a,.92);g.lineBetween(57,38,60,37);
  // Narrow folded brim outlines the back/upper side, leaving the face clear.
  g.lineStyle(3,0xb2ce8a,1);g.lineBetween(42,22,50,21);
  g.lineBetween(50,21,55,24);
  // Robin Hood's feather sprouts from the rear edge of the cap.
  g.lineStyle(4,0xf3e6b4,1);g.lineBetween(43,22,33,5);
  g.lineStyle(1.5,0xa7b989,1);g.lineBetween(43,22,33,5);
  g.lineBetween(40,16,33,5);g.lineBetween(38,12,33,5);
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

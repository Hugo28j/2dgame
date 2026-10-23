import Phaser from 'phaser';
import type { WeaponId } from '../weapons/weaponConfig';

export function ensureRangerWeaponIcon(scene: Phaser.Scene,
  weaponId: WeaponId): string | undefined {
  if (weaponId !== 'bow' && weaponId !== 'crossbow') return undefined;
  const key=`ranger-weapon-icon-${weaponId}`;
  if(scene.textures.exists(key))return key;
  const g=scene.make.graphics({x:0,y:0},false);
  if(weaponId==='bow'){
    // Curved yew longbow, pale string and a nocked forest arrow.
    g.lineStyle(8,0x3a2416,1);g.beginPath();g.moveTo(28,5);g.lineTo(42,18);
    g.lineTo(47,32);g.lineTo(42,46);g.lineTo(28,59);g.strokePath();
    g.lineStyle(4,0x8a5d2f,1);g.beginPath();g.moveTo(29,6);g.lineTo(41,19);
    g.lineTo(46,32);g.lineTo(41,45);g.lineTo(29,58);g.strokePath();
    g.lineStyle(2,0xe0d9ad,1);g.lineBetween(28,5,19,32);g.lineBetween(19,32,28,59);
    g.lineStyle(4,0xb98545,1);g.lineBetween(10,32,55,32);
    g.fillStyle(0xa9c66d,1);g.fillTriangle(8,26,18,32,8,38);
    g.fillStyle(0xdbe3df,1);g.fillTriangle(61,32,53,27,53,37);
    g.lineStyle(5,0x5a3820,1);g.lineBetween(44,27,47,37);
  }else{
    // Heavy hunting stock with recurved limbs, cocked string and loaded bolt.
    g.lineStyle(11,0x3b2417,1);g.lineBetween(8,32,55,32);
    g.lineStyle(6,0x79502d,1);g.lineBetween(10,30,54,30);
    g.fillStyle(0xd0a64f,1);g.fillTriangle(22,35,31,35,26,45);
    g.lineStyle(7,0x284f31,1);g.beginPath();g.moveTo(35,9);g.lineTo(45,21);
    g.lineTo(53,32);g.strokePath();g.beginPath();g.moveTo(35,55);g.lineTo(45,43);
    g.lineTo(53,32);g.strokePath();
    g.lineStyle(2,0xa8b987,1);g.lineBetween(35,9,28,32);g.lineBetween(28,32,35,55);
    g.lineStyle(4,0xb98545,1);g.lineBetween(24,27,55,27);
    g.fillStyle(0xa9c66d,1);g.fillTriangle(19,22,28,27,19,32);
    g.fillStyle(0xdbe3df,1);g.fillTriangle(62,27,54,22,54,32);
  }
  g.generateTexture(key,64,64);g.destroy();
  return key;
}

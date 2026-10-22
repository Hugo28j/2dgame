import type Phaser from 'phaser';
import { HEROES, type HeroId } from './heroConfig';
import {
  armorDefinition, type ArmorItem, type ArmorSlot,
} from '../progression/armor';
import { armorIconLook } from '../ui/armorIconArt';

/** All seven heroes use physical weapon poses and visibly worn armor. */
export const ANIMATED_HEROES = [
  'guardian', 'ranger', 'mage', 'frostblade', 'pyromancer', 'stormstrider', 'voidwalker',
] as const;
export const hasAnimatedHero = (id: HeroId): boolean =>
  ANIMATED_HEROES.some(hero => hero === id);
export type HeroWardrobe = Readonly<Record<ArmorSlot, ArmorItem | null>>;

/** Equipment is resolved from the saved IDs, never inferred from current hero or item rarity. */
export function resolveHeroWardrobe(heroId: HeroId,
  equipped: Readonly<Record<ArmorSlot, string | null>>,
  inventory: readonly ArmorItem[]): HeroWardrobe {
  const pick = (slot: ArmorSlot): ArmorItem | null => inventory.find(item =>
    item.id === equipped[slot] && item.heroId === heroId &&
    armorDefinition(item).slot === slot) ?? null;
  return { helm: pick('helm'), body: pick('body'), boots: pick('boots') };
}

export function wardrobeKey(heroId: HeroId, wardrobe: HeroWardrobe): string {
  const parts = (['helm', 'body', 'boots'] as const).map(slot => {
    const item = wardrobe[slot];
    return item ? item.kind + '-' + item.rarity : 'none';
  });
  return 'hero-worn-' + heroId + '-' + parts.join('--');
}

type Ctx = CanvasRenderingContext2D;
function path(ctx: Ctx, vertices: readonly [number,number][], color: string, edge: string): void {
  ctx.beginPath();
  vertices.forEach(([x,y],index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath(); ctx.fillStyle=color;ctx.fill();
  ctx.strokeStyle=edge;ctx.lineWidth=1.3;ctx.stroke();
}
function stroke(ctx: Ctx, vertices: readonly [number,number][], color: string, width = 1.5): void {
  ctx.beginPath();vertices.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();
}
function gem(ctx: Ctx, x:number,y:number,color:string,scale=1):void {
  path(ctx,[[x,y-3*scale],[x+2.4*scale,y],[x,y+3*scale],[x-2.4*scale,y]],
    color,'#192636');
}
/** Overpaint armor on top of the existing 64px top-down body. Boots are left/back,
 * torso at the center, helmet at the front/right; all rotate together with the hero.
 * Each variant changes the actual silhouette, not just the UI badge. */
function paintPiece(ctx:Ctx, item:ArmorItem):void {
  const look=armorIconLook(item);
  const { light,shadow,theme,rarityColor,variant,decorationCount,slot }=look;
  ctx.save();
  ctx.shadowColor=rarityColor;
  ctx.shadowBlur=decorationCount>=3?2.5:0;
  if(slot==='boots') {
    for(const y of [21,40]) {
      const x=variant===0?5:variant===1?4:6;
      path(ctx,[[x,y-1],[x+15,y-3],[x+20,y+6],[x+12,y+10],[x-1,y+9]],
        variant===1?shadow:theme,rarityColor);
      path(ctx,[[x+4,y+1],[x+12,y],[x+15,y+6],[x+4,y+7]],light,theme);
      if(variant===0) { // winged Wind Boots
        path(ctx,[[x+10,y],[x+15,y-6],[x+19,y-3],[x+16,y+4]],light,rarityColor);
      } else if(variant===1) {
        stroke(ctx,[[x+5,y+7],[x+10,y+3],[x+14,y+6]],rarityColor);
      } else { // cleated Runner Treads
        for(let i=0;i<3;i++) stroke(ctx,[[x+2+i*5,y+8],[x+4+i*5,y+11]],light,.9);
      }
    }
  } else if(slot==='body') {
    if(variant===0) { // bulwark's wide layered pauldrons
      path(ctx,[[23,12],[41,12],[50,20],[51,45],[44,52],[23,52],[19,43],[18,23]],
        shadow,rarityColor);
      path(ctx,[[21,13],[35,14],[34,27],[19,25]],light,theme);
      path(ctx,[[34,40],[34,52],[21,49],[21,40]],theme,rarityColor);
    } else if(variant===1) { // leather harness and diagonal straps
      path(ctx,[[24,15],[45,16],[49,23],[48,46],[42,51],[24,50],[21,43],[22,22]],
        shadow,rarityColor);
      stroke(ctx,[[24,16],[42,48]],light,3);
      stroke(ctx,[[44,16],[25,47]],theme,3);
    } else { // plated scale-mail
      path(ctx,[[24,13],[44,14],[50,23],[47,49],[23,50],[20,23]],theme,rarityColor);
      for(let y=20;y<46;y+=8)
        for(let x=27;x<45;x+=8)
          stroke(ctx,[[x-3,y],[x,y+4],[x+3,y]],light,1.1);
    }
    path(ctx,[[29,25],[43,22],[46,31],[37,39],[28,32]],theme,rarityColor);
    gem(ctx,37,31,rarityColor,variant===0?1.5:1);
    if(decorationCount>=3) {
      stroke(ctx,[[22,18],[26,14],[31,19]],light,1.5);
      stroke(ctx,[[42,17],[47,13],[50,21]],light,1.5);
    }
  } else { // head at (49,33)
    if(variant===0) { // vanguard full-face helm / visor
      path(ctx,[[42,24],[49,21],[58,25],[61,33],[56,43],[44,42],[40,34]],
        theme,rarityColor);
      path(ctx,[[45,28],[59,28],[58,35],[46,35]],shadow,light);
      stroke(ctx,[[47,32],[59,32]],rarityColor,1.8);
    } else if(variant===1) { // pointed hunter hood and mantle
      path(ctx,[[42,25],[48,16],[58,24],[61,39],[52,45],[42,40]],shadow,rarityColor);
      path(ctx,[[48,20],[55,26],[53,37],[44,35]],theme,light);
      stroke(ctx,[[46,34],[58,32]],light,1.4);
    } else { // sage crown with gem
      path(ctx,[[39,30],[41,22],[46,27],[49,18],[53,26],[60,21],[62,32],[57,39],[43,38]],
        theme,rarityColor);
      stroke(ctx,[[41,31],[59,31]],light,2);
      gem(ctx,49,27,rarityColor,1.4);
    }
    if(decorationCount===4) {
      stroke(ctx,[[46,21],[49,14],[52,21]],'#fffbcc',1.4);
    }
  }
  if(decorationCount>=2) {
    const x=slot==='boots'?13:slot==='body'?28:53;
    const y=slot==='boots'?19:slot==='body'?15:23;
    gem(ctx,x,y,rarityColor,decorationCount>=4?.9:.65);
  }
  ctx.restore();
}

/** Cache 64x64 dressed sprites. Swapping only the visual texture preserves physics,
 * HP, rotation, attack cadence and all stored equipment values. */
export function ensureDressedHeroTexture(scene:Phaser.Scene,heroId:HeroId,
  equipped:Readonly<Record<ArmorSlot,string|null>>,inventory:readonly ArmorItem[]):string {
  const base=HEROES[heroId].textureKey;
  if(!hasAnimatedHero(heroId)) return base;
  const wardrobe=resolveHeroWardrobe(heroId,equipped,inventory);
  if(!wardrobe.helm&&!wardrobe.body&&!wardrobe.boots)return base;
  const key=wardrobeKey(heroId,wardrobe);
  if(scene.textures.exists(key))return key;
  const canvas=scene.textures.createCanvas(key,64,64);
  if(!canvas)return base;
  const ctx=canvas.getContext();
  const source=scene.textures.get(base).getSourceImage() as CanvasImageSource;
  ctx.clearRect(0,0,64,64);
  ctx.drawImage(source,0,0,64,64);
  for(const slot of ['boots','body','helm'] as const){
    const item=wardrobe[slot];if(item)paintPiece(ctx,item);
  }
  canvas.refresh();
  return key;
}

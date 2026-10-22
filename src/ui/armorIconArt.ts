import type Phaser from 'phaser';
import type { HeroId } from '../heroes/heroConfig';
import {
  armorDefinition, RARITY_CONFIG, type ArmorItem, type ArmorRarity, type ArmorSlot,
} from '../progression/armor';

/** 63 original armor designs x five rarity finishes. Generated lazily, without asset downloads. */
export const ARMOR_ICON_SIZE = 96;

export interface ArmorIconLook {
  key: string;
  heroId: HeroId;
  slot: ArmorSlot;
  variant: number;
  theme: string;
  light: string;
  shadow: string;
  rarity: ArmorRarity;
  rarityColor: string;
  decorationCount: number;
}

const HERO_PALETTE: Record<HeroId, [string, string, string]> = {
  guardian: ['#d6a64d', '#ffed9e', '#563923'],       // sun-forged heavy brass
  ranger: ['#269c83', '#b8ffbd', '#124b3b'],         // forest leather and emerald
  mage: ['#8266dd', '#efe0ff', '#332465'],           // amethyst arcana
  frostblade: ['#61ccee', '#effdff', '#1a619d'],     // glacial crystal
  pyromancer: ['#e56837', '#ffda7a', '#702c25'],     // molten iron
  stormstrider: ['#edca48', '#fcffaf', '#2e60a7'],   // lightning-charged gold
  voidwalker: ['#9a60bf', '#f2c6ff', '#351747'],     // starless violet
};

const RARITY_TRIMS: Record<ArmorRarity, string> = {
  common: '#b5c0cb', uncommon: '#73f4a1', rare: '#7bdeff',
  epic: '#d8aaff', legendary: '#ffe18a',
};
const RARITY_DECORATIONS: Record<ArmorRarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

export function armorIconLook(item: Pick<ArmorItem, 'kind' | 'heroId' | 'rarity'>): ArmorIconLook {
  const definition = armorDefinition(item as ArmorItem);
  const variants = definition.slot === 'helm'
    ? ['vanguard-helm', 'hunter-hood', 'sage-crown']
    : definition.slot === 'body'
      ? ['bulwark-plate', 'iron-vest', 'warden-mail']
      : ['wind-boots', 'swift-greaves', 'runner-treads'];
  const [theme, light, shadow] = HERO_PALETTE[item.heroId];
  return {
    key: 'armor-art-' + item.kind + '-' + item.rarity,
    heroId: item.heroId,
    slot: definition.slot,
    variant: Math.max(0, variants.indexOf(item.kind.slice(item.heroId.length + 1))),
    theme, light, shadow, rarity: item.rarity,
    rarityColor: '#' + RARITY_CONFIG[item.rarity].color.toString(16).padStart(6, '0'),
    decorationCount: RARITY_DECORATIONS[item.rarity],
  };
}

type Ctx = CanvasRenderingContext2D;
type Point = [number, number];
function poly(ctx: Ctx, points: Point[], fill: string | CanvasGradient | CanvasPattern, stroke = '#0c1725', width = 2.5): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (width) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function line(ctx: Ctx, points: Point[], color: string, width = 2.6): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function disc(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke?: string): void {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.8; ctx.stroke(); }
}
function diamond(ctx: Ctx, x: number, y: number, size: number, fill: string): void {
  poly(ctx, [[x, y-size], [x+size*.75, y], [x, y+size], [x-size*.75, y]],
    fill, '#142136', 1.2);
}

/** Main equipment silhouette: three hand-drawn pieces for each of the three slots. */
function drawShape(ctx: Ctx, look: ArmorIconLook): void {
  const { theme, light, shadow, variant } = look;
  const edge = RARITY_TRIMS[look.rarity];
  const metal = ctx.createLinearGradient(27, 21, 68, 78);
  metal.addColorStop(0, light);
  metal.addColorStop(.29, theme);
  metal.addColorStop(.8, shadow);
  metal.addColorStop(1, theme);

  if (look.slot === 'helm' && variant === 0) { // Vanguard: tower helmet, reinforced visor.
    poly(ctx, [[29,31],[36,21],[48,17],[60,21],[68,31],[65,70],[31,70]], metal, edge, 2.2);
    poly(ctx, [[34,42],[62,42],[59,56],[37,56]], '#172b39', theme, 1.6);
    line(ctx, [[35,49],[61,49]], light, 3);
    line(ctx, [[48,55],[48,69]], edge, 2);
    poly(ctx, [[42,21],[48,11],[54,21],[51,38],[45,38]], light, shadow, 1.8);
    line(ctx, [[29,33],[37,37]], light, 2);
    line(ctx, [[67,33],[59,37]], light, 2);
  } else if (look.slot === 'helm' && variant === 1) { // Hunter: layered arrow cowl.
    poly(ctx, [[48,13],[24,35],[24,66],[33,75],[63,75],[72,66],[72,35]], shadow, theme, 3.2);
    poly(ctx, [[48,19],[32,35],[30,54],[48,46],[66,54],[64,35]], metal, light, 1.6);
    poly(ctx, [[33,48],[48,41],[63,48],[61,63],[48,71],[35,63]], '#112b34', edge, 1.8);
    line(ctx, [[35,57],[43,54],[48,57],[53,54],[61,57]], light, 2.2);
    line(ctx, [[48,18],[48,37]], edge, 2.1);
  } else if (look.slot === 'helm') { // Sage: arcane crown with prongs and central crystal.
    poly(ctx, [[28,37],[29,21],[42,34],[48,12],[54,34],[67,21],[68,37],[65,59],[31,59]],
      metal, edge, 2.4);
    poly(ctx, [[31,59],[65,59],[61,70],[35,70]], shadow, edge, 1.5);
    diamond(ctx, 48, 39, 9, edge);
    diamond(ctx, 35, 44, 4, light); diamond(ctx, 61, 44, 4, light);
    line(ctx, [[33,63],[63,63]], light, 2);
  } else if (look.slot === 'body' && variant === 0) { // Bulwark: massive segmented plate.
    poly(ctx, [[30,24],[38,17],[58,17],[66,24],[81,31],[75,51],[67,47],[66,76],[30,76],[29,47],[21,51],[15,31]],
      metal, edge, 2.5);
    poly(ctx, [[17,32],[33,21],[35,45],[24,54],[15,43]], theme, edge, 2);
    poly(ctx, [[79,32],[63,21],[61,45],[72,54],[81,43]], theme, edge, 2);
    poly(ctx, [[37,27],[59,27],[62,49],[48,62],[34,49]], shadow, light, 1.8);
    line(ctx, [[32,61],[48,67],[64,61]], edge, 2.2);
    line(ctx, [[48,28],[48,63]], light, 1.7);
  } else if (look.slot === 'body' && variant === 1) { // Iron Vest: leather straps + inset plating.
    poly(ctx, [[31,19],[40,24],[56,24],[65,19],[75,35],[65,46],[63,76],[33,76],[31,46],[21,35]],
      metal, edge, 2.2);
    poly(ctx, [[36,23],[44,27],[40,74],[30,70]], shadow, theme, 1.8);
    poly(ctx, [[60,23],[52,27],[56,74],[66,70]], shadow, theme, 1.8);
    line(ctx, [[36,43],[60,66]], light, 4);
    line(ctx, [[60,43],[36,66]], edge, 3);
    disc(ctx, 48, 55, 5, theme, light);
  } else if (look.slot === 'body') { // Warden: overlapping mail scales.
    poly(ctx, [[29,20],[40,24],[56,24],[67,20],[76,35],[66,49],[64,77],[32,77],[30,49],[20,35]],
      metal, edge, 2.3);
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 4; i++) {
        const x = 36 + i*8 + (row%2)*4, y = 35 + row*10;
        line(ctx, [[x-3,y],[x,y+5],[x+3,y]], row%2 ? light : edge, 1.8);
      }
    }
    poly(ctx, [[43,22],[53,22],[57,31],[48,40],[39,31]], shadow, light, 1.6);
  } else if (look.slot === 'boots' && variant === 0) { // Wind: wings and feathered ankle armor.
    for (const offset of [0, 32]) {
      poly(ctx, [[23+offset,20],[40+offset,22],[42+offset,53],[47+offset,65],
        [43+offset,77],[15+offset,77],[12+offset,69],[20+offset,57]],
        metal, edge, 2.1);
      poly(ctx, [[23+offset,26],[10+offset,18],[17+offset,40],[5+offset,36],
        [19+offset,58],[28+offset,45]], light, shadow, 1.4);
      line(ctx, [[23+offset,45],[38+offset,45]], edge, 2);
    }
  } else if (look.slot === 'boots' && variant === 1) { // Swift: articulated long greaves.
    for (const offset of [0, 31]) {
      poly(ctx, [[22+offset,17],[41+offset,17],[40+offset,58],[47+offset,68],
        [43+offset,77],[14+offset,77],[11+offset,68],[19+offset,58]],
        metal, edge, 2);
      poly(ctx, [[22+offset,20],[37+offset,20],[35+offset,42],[29+offset,49],
        [21+offset,42]], light, shadow, 1.6);
      line(ctx, [[18+offset,62],[40+offset,62]], edge, 2.5);
      diamond(ctx, 29+offset, 55, 3, edge);
    }
  } else { // Runner: jagged tread boots with strong ankle guard.
    for (const offset of [0, 31]) {
      poly(ctx, [[20+offset,18],[39+offset,23],[36+offset,55],[47+offset,64],
        [45+offset,75],[13+offset,77],[10+offset,68],[19+offset,53]],
        metal, edge, 2);
      poly(ctx, [[19+offset,38],[39+offset,35],[32+offset,49],[39+offset,52],
        [22+offset,61]], shadow, light, 2);
      line(ctx, [[16+offset,73],[23+offset,68],[30+offset,73],[37+offset,68],[43+offset,73]], light, 2);
    }
  }
}

/** Seven distinct hero emblems etched into the gear; independent of its rarity. */
function drawHeroMark(ctx: Ctx, hero: HeroId, x: number, y: number, scale: number, ink: string): void {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  switch(hero) {
    case 'guardian':
      poly(ctx, [[0,-12],[10,-7],[8,5],[0,13],[-8,5],[-10,-7]], '#192734', ink, 1.8);
      line(ctx, [[0,-9],[0,10],[-5,2],[5,2]], ink, 2.2);
      break;
    case 'ranger':
      line(ctx, [[-7,9],[7,-9]], ink, 2.4);
      poly(ctx, [[4,-10],[12,-13],[9,-5]], ink, ink, 1);
      line(ctx, [[-8,-3],[-4,1],[1,3]], ink, 1.8);
      break;
    case 'mage':
      disc(ctx,0,0,9,'#25325f',ink);
      diamond(ctx,0,0,7,ink);
      disc(ctx,0,0,2,'#ffffff');
      break;
    case 'frostblade':
      line(ctx,[[-11,0],[11,0]],ink,2);
      line(ctx,[[0,-11],[0,11]],ink,2);
      line(ctx,[[-8,-8],[8,8]],ink,1.7);
      line(ctx,[[8,-8],[-8,8]],ink,1.7);
      break;
    case 'pyromancer':
      poly(ctx,[[0,-13],[7,-2],[10,9],[0,13],[-9,8],[-6,-4]],ink,ink,1);
      poly(ctx,[[1,-2],[5,7],[0,10],[-4,6]],'#e34d2a','#ffebac',1.2);
      break;
    case 'stormstrider':
      poly(ctx,[[1,-13],[-8,1],[0,0],[-3,13],[10,-4],[2,-3]],ink,ink,1);
      break;
    case 'voidwalker':
      ctx.strokeStyle=ink; ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(0,0,11,7,0,0,Math.PI*2);ctx.stroke();
      disc(ctx,0,0,4,ink);disc(ctx,0,0,1.5,'#1b1227');
      break;
  }
  ctx.restore();
}

function drawRarity(ctx: Ctx, look: ArmorIconLook): void {
  const { rarityColor, decorationCount, light } = look;
  if (decorationCount === 0) return;
  ctx.save();
  ctx.shadowBlur = decorationCount >= 3 ? 15 : 7;
  ctx.shadowColor = rarityColor;
  for (let i = 0; i < decorationCount; i++) {
    const a = (-145 + i * 290 / Math.max(1, decorationCount - 1)) * Math.PI / 180;
    const x = 48 + Math.cos(a)*40;
    const y = 48 + Math.sin(a)*40;
    diamond(ctx, x, y, 3.8 + decorationCount*.55, rarityColor);
  }
  if (decorationCount >= 3) {
    for (const a of [-.85,-.3,.3,.85]) {
      const x=48+Math.sin(a)*45, y=48-Math.cos(a)*43;
      line(ctx,[[x,y],[x+Math.sin(a)*6,y-Math.cos(a)*6]],rarityColor,1.9);
    }
  }
  if (decorationCount === 4) {
    // Crown-like golden halo on legendary items.
    poly(ctx,[[34,13],[39,7],[45,13],[48,3],[52,13],[58,7],[63,13]],
      light,rarityColor,1.8);
    disc(ctx,48,12,2.6,rarityColor);
  }
  ctx.restore();
}

/** A single cached icon texture serves drops, inventory, equipped slots and details. */
export function ensureArmorIcon(scene: Phaser.Scene, item: ArmorItem): string {
  const look = armorIconLook(item);
  if (scene.textures.exists(look.key)) return look.key;
  const texture = scene.textures.createCanvas(look.key, ARMOR_ICON_SIZE, ARMOR_ICON_SIZE);
  if (!texture) throw new Error('Could not create armor icon ' + look.key);
  const ctx = texture.getContext();
  ctx.clearRect(0,0,96,96);

  const background = ctx.createRadialGradient(40,33,4,48,48,48);
  background.addColorStop(0, look.shadow);
  background.addColorStop(.68, '#14273a');
  background.addColorStop(1, '#090f20');
  ctx.beginPath();ctx.arc(48,48,45,0,Math.PI*2);
  ctx.fillStyle=background;ctx.fill();
  ctx.lineWidth=look.rarity==='legendary'?4:3;
  ctx.strokeStyle=look.rarityColor;ctx.stroke();

  ctx.save();
  ctx.beginPath();ctx.arc(48,48,42,0,Math.PI*2);ctx.clip();
  // Fine concentric filigree makes rarity readable even on low-saturation screens.
  ctx.strokeStyle=look.theme;ctx.globalAlpha=.25;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(48,48,33,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.shadowColor=look.rarityColor;ctx.shadowBlur=look.decorationCount*1.7;
  drawShape(ctx, look);
  ctx.shadowBlur=0;
  drawHeroMark(ctx,look.heroId,48,look.slot==='helm'&&look.variant===2?49:
    look.slot==='boots'?48:look.slot==='body'?53:48,
    look.slot === 'boots' ? 0.78 : 0.73, look.light);
  ctx.restore();

  drawRarity(ctx,look);
  // Gloss arc / small sparks that read as enchanted without crowding the symbol.
  ctx.beginPath();ctx.arc(48,48,39,Math.PI*1.12,Math.PI*1.6);
  ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1.7;ctx.stroke();
  if (look.decorationCount >= 2) {
    disc(ctx,78,22,1.4,'#ffffff');
    disc(ctx,18,73,1.1,look.rarityColor);
  }
  texture.refresh();
  return look.key;
}

import Phaser from 'phaser';
import { type WorldId } from './worldConfig';

/** Painterly 2.5D atlas portraits, drawn once to texture, with layered atmospheric
 * perspective rather than external images, WebGL shaders or heavy 3D assets.
 * Dimensions are doubled relative to the mobile card for crisp retina output. */
const WIDTH = 660;
const HEIGHT = 630;
const COLORS: Record<WorldId, {
  skyTop: string; skyBottom: string; haze: string; back: string; mid: string;
  foreground: string; highlight: string; glow: string;
}> = {
  1: {skyTop:'#071c23',skyBottom:'#c4a978',haze:'#c9e7af',back:'#2c625b',
    mid:'#244c3b',foreground:'#112d23',highlight:'#b9df71',glow:'#edffb3'},
  2: {skyTop:'#10253c',skyBottom:'#c1ecfa',haze:'#f0fdff',back:'#719fb9',
    mid:'#4c849b',foreground:'#204c61',highlight:'#c5f4ff',glow:'#ffffff'},
  3: {skyTop:'#180f27',skyBottom:'#ee6846',haze:'#ffb469',back:'#863c3c',
    mid:'#60282e',foreground:'#271c25',highlight:'#ffd17a',glow:'#ff7c3f'},
  4: {skyTop:'#091a38',skyBottom:'#9e9cc3',haze:'#e4d5e5',back:'#515c87',
    mid:'#363c68',foreground:'#1b2649',highlight:'#f9eaa8',glow:'#fff8c4'},
  5: {skyTop:'#08091c',skyBottom:'#4e306b',haze:'#e4adfa',back:'#44315e',
    mid:'#382450',foreground:'#160f30',highlight:'#df9aff',glow:'#ffbcff'},
};

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function colorWash(ctx: CanvasRenderingContext2D, a: string, b: string): void {
  const g = ctx.createLinearGradient(0,0,0,HEIGHT);
  g.addColorStop(0,a); g.addColorStop(0.70,b); g.addColorStop(1,b);
  ctx.fillStyle=g; ctx.fillRect(0,0,WIDTH,HEIGHT);
}
function halo(ctx: CanvasRenderingContext2D, x:number,y:number, r:number,
  color:string, opacity=0.6):void {
  ctx.save(); ctx.globalAlpha=opacity;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(.13,color);
  g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
function polygon(ctx:CanvasRenderingContext2D,points:readonly (readonly [number,number])[],
  color:string):void {
  if(!points.length)return;
  ctx.beginPath();ctx.moveTo(points[0]![0],points[0]![1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i]![0],points[i]![1]);
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function strokePath(ctx:CanvasRenderingContext2D,points:readonly (readonly [number,number])[],
  color:string,width:number):void {
  ctx.beginPath();ctx.moveTo(points[0]![0],points[0]![1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i]![0],points[i]![1]);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,
  fill:string,alpha=1):void {
  ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),
    Math.max(.1,ry),0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
function ridge(ctx:CanvasRenderingContext2D,rand:()=>number,y:number,amp:number,
  color:string,step=45):void {
  const pts:[number,number][]=[[-40,HEIGHT],[-40,y]];
  for(let x=0;x<=WIDTH+40;x+=step){
    const peak=y+(rand()-.42)*amp - Math.sin(x/128)*amp*.3;
    pts.push([x,peak]);
  }
  pts.push([WIDTH+40,HEIGHT]);polygon(ctx,pts,color);
}
function cloud(ctx:CanvasRenderingContext2D,x:number,y:number,scale:number,color:string,
  alpha=0.3):void {
  ellipse(ctx,x,y,75*scale,20*scale,color,alpha);
  ellipse(ctx,x-45*scale,y-6*scale,37*scale,22*scale,color,alpha*.84);
  ellipse(ctx,x+36*scale,y-10*scale,58*scale,25*scale,color,alpha*.72);
  ellipse(ctx,x+5*scale,y-20*scale,46*scale,24*scale,color,alpha*.63);
}
function rocks(ctx:CanvasRenderingContext2D,rand:()=>number,base:number,color:string,
  shine:string,count:number):void {
  for(let i=0;i<count;i++){
    const x=-10+rand()*(WIDTH+20);
    const size=16+rand()*75,y=base+rand()*90;
    const points:[number,number][]=[[x-size,y+size*.30],[x-size*.48,y-size*.72],
      [x+size*.12,y-size],[x+size,y-size*.21],[x+size*.69,y+size*.40]];
    polygon(ctx,points,color);
    polygon(ctx,[[x-size*.48,y-size*.72],[x+size*.12,y-size],
      [x+size*.02,y+size*.1],[x-size*.27,y+size*.18]],shine);
  }
}
function particles(ctx:CanvasRenderingContext2D,rand:()=>number,n:number,color:string,
  top:number,bottom:number,min=1,max=3):void {
  for(let i=0;i<n;i++){
    const x=rand()*WIDTH,y=top+rand()*(bottom-top),r=min+rand()*(max-min);
    ellipse(ctx,x,y,r,r,color,.16+rand()*.72);
    if(i%7===0){ctx.strokeStyle=color;ctx.globalAlpha=.27;ctx.lineWidth=1;
      strokePath(ctx,[[x-r*3,y],[x+r*3,y]],color,.6);
      strokePath(ctx,[[x,y-r*3],[x,y+r*3]],color,.6);ctx.globalAlpha=1;}
  }
}
function tower(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,
  stone:string,light:string,accent:string):void {
  polygon(ctx,[[x-w*.54,y],[x-w*.5,y-h],[x+w*.42,y-h],
    [x+w*.56,y]],stone);
  polygon(ctx,[[x-w*.54,y-h],[x,y-h-w*.75],[x+w*.55,y-h]],accent);
  polygon(ctx,[[x-w*.34,y-h*.96],[x-w*.14,y-h*.96],
    [x-w*.14,y-h*.12],[x-w*.34,y-h*.12]],light);
  for(let i=0;i<3;i++){
    const wy=y-h*.78+i*h*.20;
    ellipse(ctx,x+w*.18,wy,w*.09,w*.105,'#f9d985',.75);
    ellipse(ctx,x+w*.18,wy,w*.04,w*.07,'#ffffff',.6);
  }
}
function rootsAndLeaves(ctx:CanvasRenderingContext2D,rand:()=>number):void {
  for(const side of [-1,1]){
    const origin=side===-1?28:WIDTH-28;
    for(let i=0;i<13;i++){
      const y=HEIGHT-15-rand()*235;
      const reach=(32+rand()*130)*-side;
      strokePath(ctx,[[origin,y+70],[origin+reach*.32,y+30],
        [origin+reach*.78,y-27],[origin+reach,y-55]],'#173e2f',5+rand()*5);
      for(let k=0;k<4;k++){
        const p=k/4;
        const x=origin+reach*p*.91;
        const py=y+42-110*p;
        ellipse(ctx,x+10*side,py,14+rand()*10,5+rand()*5,
          k%2?'#5b9353':'#8ebd5b',.75);
      }
    }
  }
}
function verdant(ctx:CanvasRenderingContext2D,rand:()=>number):void {
  halo(ctx,340,228,260,'#e7ffb7',.25);
  ridge(ctx,rand,337,135,'#4f8066',80);
  ridge(ctx,rand,391,110,'#315946',58);
  // Ancient stair temple; perspective walls recede into the misty distance.
  polygon(ctx,[[144,488],[274,334],[389,334],[518,488]],'#1a3f37');
  polygon(ctx,[[220,463],[278,347],[374,347],[438,463]],'#5f8070');
  polygon(ctx,[[252,438],[283,357],[366,357],[400,438]],'#354f41');
  polygon(ctx,[[263,371],[280,318],[373,318],[390,371]],'#264a3c');
  for(let i=0;i<7;i++){
    const yy=468-i*19,w=176-i*17;
    polygon(ctx,[[330-w,yy],[330+w,yy],[330+w+14,yy+10],[330-w-14,yy+10]],
      i%2?'#54745b':'#718a60');
    strokePath(ctx,[[330-w,yy],[330+w,yy]],'#a7bb76',1.5);
  }
  for(const x of [222,424]){tower(ctx,x,417,58,185,'#536f59','#344c38','#294c3b');
    for(let j=0;j<8;j++){ellipse(ctx,x+(rand()-.5)*45,295+rand()*124,
      5+rand()*12,2+rand()*5,j%2?'#94b45e':'#365f3b',.86);}}
  // A sleeping moss titan is carved into the distant stone wall.
  ellipse(ctx,330,283,52,57,'#345b45',.92);
  polygon(ctx,[[278,266],[257,235],[294,248],[330,230],[371,247],
    [402,235],[381,272]],'#2b6745');
  ellipse(ctx,310,285,8,4,'#d2e678',.92);
  ellipse(ctx,351,285,8,4,'#d2e678',.92);
  strokePath(ctx,[[310,313],[332,327],[351,313]],'#a0b76a',3);
  // Foreground hanging branches, stepped cliff and soft fireflies.
  ridge(ctx,rand,553,56,'#183828',33);
  rocks(ctx,rand,557,'#122b22','#254b31',12);
  rootsAndLeaves(ctx,rand);
  particles(ctx,rand,85,'#d6f897',130,HEIGHT-55,1,3);
}
function frozen(ctx:CanvasRenderingContext2D,rand:()=>number):void {
  // Aurora veils and an enormous pale winter sun behind the pinnacles.
  halo(ctx,450,185,260,'#e3fcff',.46);
  ellipse(ctx,450,177,62,62,'#f0ffff',.72);
  for(let i=0;i<4;i++){
    ctx.save();ctx.globalAlpha=.11+i*.022;
    strokePath(ctx,[[0,135+i*26],[135,122+i*14],[295,190-i*21],
      [440,118+i*12],[660,142-i*15]],i%2?'#8bffd9':'#c1f6ff',30-i*4);
    ctx.restore();
  }
  ridge(ctx,rand,352,155,'#aacddc',65);
  for(const [x,y,w,h] of [[102,468,155,247],[282,441,180,298],
    [521,479,150,259],[435,465,119,172]]){
    polygon(ctx,[[x-w*.58,y],[x,y-h],[x+w*.62,y]],'#9dc7d9');
    polygon(ctx,[[x-w*.58,y],[x,y-h],[x-.02*w,y]],'#d7f9ff');
    polygon(ctx,[[x-w*.1,y-h*.7],[x,y-h],[x+w*.62,y]],'#4e8fac');
    strokePath(ctx,[[x,y-h],[x+w*.20,y-h*.46]],'#f7feff',3);
  }
  // Frost fortress with crystal arch and a softly luminous gate.
  polygon(ctx,[[250,465],[262,330],[385,330],[408,465]],'#2c6279');
  polygon(ctx,[[265,350],[326,245],[389,350]],'#b8eafa');
  polygon(ctx,[[294,361],[325,273],[356,361]],'#e8ffff');
  for(const x of [235,416]){
    polygon(ctx,[[x-29,470],[x-25,309],[x,246],[x+26,309],[x+32,470]],'#578da2');
    polygon(ctx,[[x-29,309],[x,246],[x,330]],'#daf6ff');
    ellipse(ctx,x,357,7,26,'#c1fdff',.86);
  }
  ellipse(ctx,329,431,42,58,'#091f42',1);
  ellipse(ctx,329,431,30,45,'#72cbef',.9);
  strokePath(ctx,[[290,478],[289,409],[329,369],[369,409],[369,478]],'#e8faff',7);
  ridge(ctx,rand,535,45,'#79aebf',38);
  rocks(ctx,rand,550,'#31677b','#90cade',16);
  particles(ctx,rand,150,'#f5ffff',25,HEIGHT-10,1,3.6);
}
function ember(ctx:CanvasRenderingContext2D,rand:()=>number):void {
  halo(ctx,345,275,300,'#ff842e',.56);
  cloud(ctx,175,174,1.55,'#b74b42',.27);
  cloud(ctx,519,117,1.8,'#e16e51',.22);
  ridge(ctx,rand,388,145,'#8c3c3b',69);
  // A distant erupting stratovolcano with multiple tiers of black basalt.
  polygon(ctx,[[39,500],[228,322],[289,252],[339,279],
    [394,262],[440,329],[641,502]],'#512b34');
  polygon(ctx,[[167,428],[289,252],[339,279],[395,262],[460,415]],
    '#773837');
  polygon(ctx,[[261,266],[287,250],[335,275],[392,250],[407,267],
    [372,288],[328,293],[293,281]],'#0d1723');
  halo(ctx,334,263,115,'#ffbf55',.88);
  strokePath(ctx,[[340,284],[320,340],[365,410],[346,474],[397,548]],
    '#ff7833',24);
  strokePath(ctx,[[340,284],[320,340],[365,410],[346,474],[397,548]],
    '#ffd77c',8);
  strokePath(ctx,[[293,278],[264,334],[277,409],[223,471]],'#fa703a',11);
  for(let i=0;i<22;i++){
    const x=330+(rand()-.5)*225,y=260-rand()*240;
    ellipse(ctx,x,y,3+rand()*6,7+rand()*10,i%3?'#ff7a35':'#ffdd77',.8);
  }
  // Black crown-like volcanic citadel in the foreground.
  polygon(ctx,[[208,532],[238,406],[400,406],[439,532]],'#271d29');
  polygon(ctx,[[242,421],[279,346],[309,417],[325,329],
    [359,420],[390,350],[417,426]],'#211722');
  for(const x of [248,391])tower(ctx,x,502,56,128,'#301f2a','#271722','#401f29');
  for(let i=0;i<6;i++)ellipse(ctx,277+i*22,465,4,16,'#ff973d',.88);
  ridge(ctx,rand,548,46,'#30212b',32);
  rocks(ctx,rand,566,'#201c26','#633633',16);
  particles(ctx,rand,130,'#ffb14f',125,HEIGHT,1.0,4);
}
function storm(ctx:CanvasRenderingContext2D,rand:()=>number):void {
  halo(ctx,326,213,252,'#c9e4ff',.32);
  cloud(ctx,165,211,1.4,'#dfe9ff',.36);
  cloud(ctx,527,194,1.2,'#f2edff',.32);
  ridge(ctx,rand,391,122,'#7f89ad',71);
  // Floating tiered islands: layered underside silhouettes establish depth.
  for(const [x,y,w] of [[127,433,157],[510,404,159],[324,468,390]]){
    ellipse(ctx,x,y,w*.52,24,'#717da6',.72);
    polygon(ctx,[[x-w*.52,y],[x-w*.24,y+53],
      [x-w*.08,y+118],[x,y+151],[x+w*.16,y+106],
      [x+w*.38,y+45],[x+w*.52,y]],'#343656');
    polygon(ctx,[[x-w*.52,y],[x-w*.28,y+38],[x-w*.08,y+89],[x,y+151],
      [x-w*.06,y+49]],'#48476c');
    ellipse(ctx,x,y-8,w*.52,24,'#9ea3ba',.92);
  }
  // Golden-tipped spires of the airborne citadel.
  polygon(ctx,[[214,449],[239,329],[421,329],[450,449]],'#353959');
  polygon(ctx,[[248,345],[331,279],[399,345]],'#6b729a');
  for(const [x,h,w] of [[229,195,50],[291,246,49],[369,252,50],[436,186,50]])
    tower(ctx,x,430,w,h,'#48547e','#414c75','#2f375c');
  polygon(ctx,[[307,341],[331,237],[354,341]],'#b1aece');
  ellipse(ctx,332,388,24,37,'#201f3c',1);
  ellipse(ctx,332,383,13,24,'#ffe99f',.92);
  // Forked electric strikes, rear and foreground.
  strokePath(ctx,[[478,62],[447,144],[466,151],[415,248],[434,226],
    [401,331]],'#e5f5ff',11);
  strokePath(ctx,[[478,62],[447,144],[466,151],[415,248],[434,226],
    [401,331]],'#f9eeb0',4);
  strokePath(ctx,[[153,142],[185,203],[165,223],[202,295]],
    '#c7edff',5);
  cloud(ctx,330,544,2.9,'#cad8f0',.36);
  cloud(ctx,57,569,1.6,'#ffffff',.35);
  cloud(ctx,589,575,1.8,'#c1d8ec',.33);
  ridge(ctx,rand,603,24,'#343855',29);
  particles(ctx,rand,66,'#f0f2ff',90,590,1,2.8);
}
function voidRealm(ctx:CanvasRenderingContext2D,rand:()=>number):void {
  particles(ctx,rand,105,'#d6b8ff',5,560,1,2.3);
  halo(ctx,343,216,288,'#ac42e7',.56);
  ellipse(ctx,342,223,133,131,'#100c28',.96);
  ctx.save();ctx.lineWidth=18;ctx.strokeStyle='#b373fa';
  ctx.shadowColor='#da8aff';ctx.shadowBlur=36;
  ctx.beginPath();ctx.ellipse(342,222,139,141,-.1,0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.save();ctx.strokeStyle='#f9cbff';ctx.lineWidth=3;ctx.globalAlpha=.8;
  ctx.beginPath();ctx.ellipse(342,221,158,147,.26,.12,Math.PI*1.83);ctx.stroke();ctx.restore();
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9-.5;
    polygon(ctx,[[342+Math.cos(a)*172,222+Math.sin(a)*162],
      [342+Math.cos(a+.12)*187,222+Math.sin(a+.12)*187],
      [342+Math.cos(a-.09)*216,222+Math.sin(a-.09)*210]],'#b478e4');
  }
  // A crowned shadow titan emerges from the event horizon.
  polygon(ctx,[[253,378],[267,284],[247,212],[291,248],[308,187],
    [329,234],[355,177],[380,245],[421,209],[405,298],[433,379]],
    '#150d2b');
  ellipse(ctx,338,308,90,87,'#17102f',1);
  polygon(ctx,[[286,314],[244,290],[269,354],[293,354]],'#25183f');
  polygon(ctx,[[394,314],[424,294],[411,356],[390,356]],'#25183f');
  ellipse(ctx,317,295,14,5,'#edb3ff',.93);
  ellipse(ctx,361,295,14,5,'#edb3ff',.93);
  strokePath(ctx,[[301,341],[340,357],[378,338]],'#9b4fca',4);
  ridge(ctx,rand,507,121,'#2b1d4c',52);
  // Tilted, levitating carved monoliths over a broken crystal abyss.
  for(const [x,y,scale,tilt] of [[109,445,1.1,-.28],[533,398,.95,.22],
    [185,515,.68,-.15],[455,524,.76,.12]]){
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);
    polygon(ctx,[[-22*scale,51*scale],[-30*scale,-82*scale],
      [0,-119*scale],[31*scale,-70*scale],[23*scale,50*scale]],'#29204c');
    polygon(ctx,[[-30*scale,-82*scale],[0,-119*scale],
      [0,51*scale],[-22*scale,51*scale]],'#58377a');
    strokePath(ctx,[[0,-69*scale],[14*scale,-42*scale],[0,-16*scale],
      [-15*scale,-42*scale],[0,-69*scale]],'#e79cff',2.5);
    halo(ctx,0,-35*scale,39*scale,'#dba1ff',.22);
    ctx.restore();
  }
  rocks(ctx,rand,558,'#19142e','#684184',16);
  particles(ctx,rand,95,'#eba5ff',110,630,.8,3.4);
}
/** Returns a cached detailed background usable in thumbnails and large cards. */
export function ensureWorldDiorama(scene:Phaser.Scene, id:WorldId):string {
  const key='dungeon-atlas-2p5d-'+id;
  if(scene.textures.exists(key))return key;
  const texture=scene.textures.createCanvas(key,WIDTH,HEIGHT);
  const ctx=texture.getContext();
  const rand=seeded(48751+id*991);
  const palette=COLORS[id];
  colorWash(ctx,palette.skyTop,palette.skyBottom);
  // Atmospheric distance haze, several independently shaped ridge layers.
  const fog=ctx.createLinearGradient(0,170,0,570);
  fog.addColorStop(0,'rgba(255,255,255,0)');
  fog.addColorStop(.68,palette.haze+'29');
  fog.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=fog;ctx.fillRect(0,145,WIDTH,440);
  for(let i=0;i<4;i++)cloud(ctx,80+rand()*530,150+rand()*210,
    .7+rand()*.9,palette.haze,.06+rand()*.095);
  // World-specific landmarks, boss silhouettes, deep and near foregrounds.
  if(id===1)verdant(ctx,rand);
  else if(id===2)frozen(ctx,rand);
  else if(id===3)ember(ctx,rand);
  else if(id===4)storm(ctx,rand);
  else voidRealm(ctx,rand);
  // Print-like fine atmosphere; constrained deterministic flecks.
  ctx.save();ctx.globalAlpha=.07;
  for(let i=0;i<950;i++){
    ctx.fillStyle=i%2?'#ffffff':'#030915';
    ctx.fillRect(rand()*WIDTH,rand()*HEIGHT,1+rand()*1.2,1+rand()*1.2);
  }
  ctx.restore();
  // Cinematic vignette and warm bottom lip make each painting feel layered.
  const v=ctx.createRadialGradient(WIDTH*.51,HEIGHT*.43,WIDTH*.15,
    WIDTH*.51,HEIGHT*.45,WIDTH*.74);
  v.addColorStop(0,'rgba(0,0,0,0)');
  v.addColorStop(.73,'rgba(0,0,0,.07)');
  v.addColorStop(1,'rgba(0,3,12,.70)');
  ctx.fillStyle=v;ctx.fillRect(0,0,WIDTH,HEIGHT);
  const bottom=ctx.createLinearGradient(0,HEIGHT*.64,0,HEIGHT);
  bottom.addColorStop(0,'rgba(4,12,22,0)');
  bottom.addColorStop(1,'rgba(4,12,22,.80)');
  ctx.fillStyle=bottom;ctx.fillRect(0,HEIGHT*.60,WIDTH,HEIGHT*.40);
  texture.refresh();
  return key;
}

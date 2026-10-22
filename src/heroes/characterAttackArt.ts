import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { WeaponId } from '../weapons/weaponConfig';
import { hasAnimatedHero } from './heroEquipmentArt';

import {
  attackPoseProgress, poseForWeapon, poseLengthMs, type AttackPose,
} from './characterAttackPose';

/** Fixed 135ms hammer anticipation: impact and actual hitbox occur together. */
export const HAMMER_IMPACT_DELAY_MS = 135;

export class CharacterAttackArt {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly pose: AttackPose | null;
  private started = -100000;
  private duration = 100;
  private activePose: AttackPose | null = null;
  private attackFacing = 0;
  private destroyed = false;
  private channeling = false;

  public constructor(scene: Phaser.Scene,
    private readonly player: Player, weaponId: WeaponId) {
    this.pose = hasAnimatedHero(player.heroId) ? poseForWeapon(weaponId) : null;
    this.graphics = scene.add.graphics().setDepth(24);
    if (!this.pose) this.graphics.setVisible(false);
  }

  public begin(now: number, attackIntervalMs: number, pose: AttackPose | null = this.pose): void {
    if (!pose || this.destroyed) return;
    this.activePose = pose;
    this.attackFacing = this.player.rotation;
    this.started = now;
    this.duration = poseLengthMs(pose, attackIntervalMs);
    this.update(now);
  }

  /** Held flamethrower has continuous animated casting, not an attack per frame. */
  public setChanneling(active: boolean): void {
    this.channeling = active && this.pose === 'flamethrower';
  }

  /** One reusable Graphics object, attached to the moving/rotating sprite every frame. */
  public update(now: number): void {
    if (this.destroyed || !this.graphics.active || !this.pose || !this.player.active) return;
    const g = this.graphics;
    const timedAttack = this.activePose !== null && now < this.started + this.duration;
    const hasAttack = timedAttack || this.channeling;
    const pose = timedAttack ? this.activePose! : this.pose;
    const t = this.channeling ? (Math.sin(now * .015) + 1) / 2 :
      timedAttack ? attackPoseProgress(now, this.started, this.duration) : 1;
    const velocity = this.player.body instanceof Phaser.Physics.Arcade.Body
      ? this.player.body.velocity.length() : 0;
    const sway = velocity > 15 ? Math.sin(now * .018) * 1.3 : 0;
    g.clear();
    g.setPosition(this.player.x, this.player.y);
    g.setRotation(timedAttack ? this.attackFacing : this.player.rotation);
    if(pose==='sword')this.drawSword(g,hasAttack,t,sway);
    else if(pose==='hammer')this.drawHammer(g,hasAttack,t,sway);
    else if(pose==='bow'||pose==='crossbow'||pose==='shotgun')
      this.drawRanged(g,pose,hasAttack,t,sway);
    else if(pose==='staff'||pose==='spellbook')
      this.drawMageStaff(g,pose,hasAttack,t,sway,now);
    else if(pose==='ice-dagger'||pose==='ice-wave')
      this.drawFrostCast(g,pose,hasAttack,t,sway);
    else if(pose==='ember-staff') this.drawEmberStaff(g,hasAttack,t,sway,now);
    else if(pose==='flamethrower') this.drawFlamethrower(g,hasAttack,t,sway,now);
    else if(pose==='storm-wand') this.drawStormWand(g,hasAttack,t,sway,now);
    else if(pose==='storm-lance') this.drawStormLance(g,hasAttack,t,sway,now);
    else if(pose==='abyss-orb') this.drawAbyssOrb(g,hasAttack,t,sway,now);
    else if(pose==='shadow-scythe') this.drawShadowScythe(g,hasAttack,t,sway);
  }

  private drawSword(g:Phaser.GameObjects.Graphics,attacking:boolean,t:number,sway:number):void {
    // Hand and sword are one continuous pose. A broad rotational stroke replaces
    // the illusion of a magic arc spawning without any physical movement.
    const angle = attacking
      ? -1.05 + (1 - Math.cos(Math.PI * Math.min(1,t*1.28))) * 1.11
      : -.55 + sway*.025;
    const cx=17,cy=-12+sway*.2;
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const px=-dy,py=dx;
    g.lineStyle(7,0x916d47,1);g.lineBetween(8,-7,cx,cy);
    g.fillStyle(0xe6bd86);g.fillCircle(cx,cy,4.8);
    const sx=cx+dx*9,sy=cy+dy*9,tx=cx+dx*37,ty=cy+dy*37;
    g.lineStyle(5,0x5b6676,1);g.lineBetween(cx,cy,sx,sy);
    g.lineStyle(3,0xffe49c,1);g.lineBetween(cx+px*7,cy+py*7,cx-px*7,cy-py*7);
    g.lineStyle(8,0x8b5314,1);g.lineBetween(sx,sy,tx,ty);
    g.lineStyle(5,0xffe3a5,1);g.lineBetween(sx,sy,tx,ty);
    g.fillStyle(0xfff5c6,1);
    g.fillTriangle(tx+dx*10,ty+dy*10,tx+px*4,ty+py*4,tx-px*4,ty-py*4);
    if(attacking && t>.22 && t<.78){
      g.lineStyle(2.5,0xffea80,Math.sin(Math.PI*(t-.22)/.56)*.8);
      g.beginPath();
      g.arc(cx,cy,50,angle-.27,angle+.15,false);
      g.strokePath();
    }
  }

  private drawHammer(g:Phaser.GameObjects.Graphics,attacking:boolean,t:number,sway:number):void {
    // Raised shoulder -> physical overhead acceleration -> planted slam with recoil.
    const impactRatio=HAMMER_IMPACT_DELAY_MS/this.duration;
    let angle=-.34+sway*.022;
    if(attacking) {
      if(t<impactRatio*.47)angle=-.34-(t/(impactRatio*.47))*.83; // lift
      else if(t<impactRatio)angle=-1.17+(t-impactRatio*.47)/(impactRatio*.53)*2.10; // downstroke
      else angle=.93-Math.min(1,(t-impactRatio)/(.95-impactRatio))*.77; // recoil
    }
    const handX=16,handY=-11+sway*.22;
    const dx=Math.cos(angle),dy=Math.sin(angle),px=-dy,py=dx;
    g.lineStyle(8,0x785536,1);g.lineBetween(8,-8,handX,handY);
    g.fillStyle(0xecc18e,1);g.fillCircle(handX,handY,5);
    const headX=handX+dx*38,headY=handY+dy*38;
    // Actual iron shaft, leather grip and oversized forged hammer head.
    g.lineStyle(6,0x372f2a,1);g.lineBetween(handX,handY,headX,headY);
    g.lineStyle(3,0xc5a46b,1);g.lineBetween(handX+dx*6,handY+dy*6,headX,headY);
    for(let i=0;i<3;i++){
      const u=6+i*4;
      g.lineStyle(2,0x5b321a,1);
      g.lineBetween(handX+dx*u+px*3,handY+dy*u+py*3,
        handX+dx*(u+2)-px*3,handY+dy*(u+2)-py*3);
    }
    const corners=[
      {x:headX+px*18+dx*9,y:headY+py*18+dy*9},
      {x:headX-px*18+dx*9,y:headY-py*18+dy*9},
      {x:headX-px*18-dx*9,y:headY-py*18-dy*9},
      {x:headX+px*18-dx*9,y:headY+py*18-dy*9},
    ];
    const hammerHead = corners.map(p => new Phaser.Math.Vector2(p.x, p.y));
    g.fillStyle(0x34485b,1);g.fillPoints(hammerHead,true);
    g.lineStyle(3,0xfde68a,1);g.strokePoints(hammerHead,true);
    g.lineStyle(3,0x9dd8e9,.88);
    g.lineBetween(headX+px*13+dx*4,headY+py*13+dy*4,
      headX-px*13+dx*4,headY-py*13+dy*4);
    g.fillStyle(0xffeeaf,1);g.fillCircle(headX,headY,5);
    if(attacking && Math.abs(t-impactRatio)<.14){
      const strength=1-Math.abs(t-impactRatio)/.14;
      g.lineStyle(3,0xffe8aa,strength);
      g.strokeCircle(headX+dx*7,headY+dy*7,10+strength*17);
      g.fillStyle(0xffecae,strength*.6);
      for(const k of [-1,1])g.fillCircle(headX+dx*16+px*k*23,
        headY+dy*16+py*k*23,3);
    }
  }

  private drawRanged(g:Phaser.GameObjects.Graphics,pose:AttackPose,
    attacking:boolean,t:number,sway:number):void {
    const recoil=attacking?Math.sin(Math.PI*Math.min(1,t*1.4))*6:0;
    const gripX=22-recoil,gripY=sway*.25;
    g.lineStyle(5,0x9b7650);g.lineBetween(8,-5,gripX-2,gripY-1);
    g.fillStyle(0xf0c391,1);g.fillCircle(gripX-2,gripY-1,4.5);
    if(pose==='crossbow'){
      g.lineStyle(6,0x81552d);g.lineBetween(gripX-8,gripY,gripX+28,gripY);
      g.lineStyle(3,0xaee8d1);g.lineBetween(gripX+23,gripY-17,gripX+23,gripY+17);
      g.lineStyle(5,0x325b54);g.lineBetween(gripX+8,gripY-18,gripX+28,gripY);
      g.lineBetween(gripX+8,gripY+18,gripX+28,gripY);
      g.lineStyle(2,0xf9e1b0);
      g.lineBetween(gripX+8,gripY-18,gripX+18,gripY);
      g.lineBetween(gripX+8,gripY+18,gripX+18,gripY);
    } else { // longbow, drawn bowstring flexes and is released on every shot
      const pull=attacking?(1-Math.min(1,t*2.9))*10:4;
      g.lineStyle(3.8,0x42796a,1);
      g.beginPath();g.moveTo(gripX+12,gripY-19);
      g.lineTo(gripX+22,gripY-9);g.lineTo(gripX+25,gripY);
      g.lineTo(gripX+22,gripY+9);g.lineTo(gripX+12,gripY+19);g.strokePath();
      g.lineStyle(1.7,0xe6dfb6,1);
      g.lineBetween(gripX+12,gripY-19,gripX+12-pull,gripY);
      g.lineBetween(gripX+12-pull,gripY,gripX+12,gripY+19);
      if(!attacking||t<.22){
        g.lineStyle(2.3,0xf2e1b2,1);
        g.lineBetween(gripX+8-pull,gripY,gripX+37,gripY);
        g.fillStyle(0x9af0cf);
        g.fillTriangle(gripX+40,gripY,gripX+33,gripY-3,gripX+33,gripY+3);
      }
    }
    if(attacking&&t<.45) {
      const f=1-t/.45;
      g.fillStyle(0xb7f7e5,.60*f);
      g.fillCircle(gripX+35,gripY,3+f*4);
      g.lineStyle(1.4,0xafffe0,.8*f);
      g.lineBetween(gripX+30,gripY-8,gripX+41,gripY-8);
      g.lineBetween(gripX+30,gripY+8,gripX+41,gripY+8);
    }
  }

  /** A long staff is physically gripped and sweeps from overhead to a forward cast.
   * Spellbook uses the same staff, with purple rune rings at the release point.
   * All geometry is drawn in hero-local coordinates, thus follows facing and walking. */
  private drawMageStaff(g: Phaser.GameObjects.Graphics, pose: 'staff' | 'spellbook',
    attacking: boolean, t: number, sway: number, now: number): void {
    // Arm winds up before release, staff tip leads the magic projectile.
    const swing = attacking ? (t < .28 ? -1.05 - t * 1.4 :
      t < .7 ? -1.44 + (t - .28) / .42 * 2.05 :
        .61 - (t - .7) / .3 * .67) : -.43 + sway * .018;
    const handle = { x: 20, y: -9 + sway * .25 };
    const dx = Math.cos(swing), dy = Math.sin(swing);
    const px = -dy, py = dx;
    const tipX = handle.x + dx * 56, tipY = handle.y + dy * 56;
    // Animated sleeve, forearm, glove and grip.
    g.lineStyle(8, 0x533398, 1); g.lineBetween(10, -11, handle.x - 3, handle.y);
    g.lineStyle(4, 0xd8b4fe, .82); g.lineBetween(13, -12, handle.x - 3, handle.y);
    g.fillStyle(0xeac6aa); g.fillCircle(handle.x, handle.y, 5.5);
    // Forged and ornamented staff, thick enough to read on phones.
    g.lineStyle(9, 0x342251, 1);
    g.lineBetween(handle.x - dx * 10, handle.y - dy * 10, tipX, tipY);
    g.lineStyle(4, 0xcca1f9, 1);
    g.lineBetween(handle.x + dx * 9, handle.y + dy * 9, tipX - dx * 4, tipY - dy * 4);
    for (let i = 0; i < 4; i++) {
      const q = 16 + i * 9, x = handle.x + dx * q, y = handle.y + dy * q;
      g.lineStyle(2.2, 0xf2dcff, .87);
      g.lineBetween(x + px * 5, y + py * 5, x - px * 5, y - py * 5);
    }
    // Crescent-shaped head and a faceted crystal. Alternate texture for Rune Tome.
    const trim = pose === 'staff' ? 0xe9d5ff : 0xffd0fd;
    g.lineStyle(4, 0x8c62dd, 1);
    g.lineBetween(tipX + px * 12 - dx * 5, tipY + py * 12 - dy * 5,
      tipX + px * 6 + dx * 9, tipY + py * 6 + dy * 9);
    g.lineBetween(tipX - px * 12 - dx * 5, tipY - py * 12 - dy * 5,
      tipX - px * 6 + dx * 9, tipY - py * 6 + dy * 9);
    g.fillStyle(0xf4c6ff, .92);
    g.fillTriangle(tipX + dx * 14, tipY + dy * 14,
      tipX + px * 7, tipY + py * 7,
      tipX - px * 7, tipY - py * 7);
    g.fillStyle(0xa866ff, 1); g.fillCircle(tipX, tipY, 7);
    g.fillStyle(0xffffff, .92); g.fillCircle(tipX + dx * 2, tipY + dy * 1, 2.7);
    // Charge -> pulse at the exact firing moment. No new projectile or damage.
    if (attacking) {
      const pulse = t < .53 ? t / .53 : (1 - t) / .47;
      const strength = Math.max(0, Math.min(1, pulse));
      g.lineStyle(2.5, trim, strength * .9);
      g.strokeCircle(tipX, tipY, 9 + strength * (pose === 'spellbook' ? 15 : 10));
      if (pose === 'spellbook') {
        const a = now / 320;
        for (let i = 0; i < 4; i++) {
          const angle = a + i * Math.PI / 2;
          g.fillStyle(trim, strength * .8);
          g.fillCircle(tipX + Math.cos(angle) * 17, tipY + Math.sin(angle) * 17, 2.1);
        }
      }
    }
  }

  /** Ice Daggers: shoulder lifts, open palm flicks forward to throw a crystal.
   * Big Wave: both hands sweep outward, meeting in a frosty crest that grows
   * from the player's palms. Only existing gameplay projectiles cause damage. */
  private drawFrostCast(g: Phaser.GameObjects.Graphics, pose: 'ice-dagger' | 'ice-wave',
    attacking: boolean, t: number, sway: number): void {
    const icy = 0xcafaff, edge = 0x7dd3fc, sleeve = 0x155f97;
    const wave = pose === 'ice-wave';
    if (wave) {
      const reach = attacking ? (t < .62 ? t / .62 : Math.max(0, 1 - (t - .62) / .38)) : .15;
      for (const side of [-1, 1]) {
        const shoulderX = 9, shoulderY = side * 12;
        const palmX = 19 + reach * 18, palmY = side * (13 + 13 * reach) + sway * .2;
        g.lineStyle(8, sleeve, 1); g.lineBetween(shoulderX, shoulderY, palmX - 3, palmY);
        g.lineStyle(3, edge, .95); g.lineBetween(shoulderX + 2, shoulderY, palmX, palmY);
        g.fillStyle(icy, 1); g.fillCircle(palmX, palmY, 5.4);
        if (attacking && t < .9) {
          const strength = Math.sin(Math.PI * Math.min(1, t / .9));
          g.lineStyle(2.5, 0xbff7ff, strength * .85);
          g.beginPath(); g.arc(palmX + 4, palmY,
            12 + 16 * strength, side < 0 ? -1.6 : 0,
            side < 0 ? 0 : 1.6, false); g.strokePath();
          g.fillStyle(0xffffff, strength * .75);
          for (let i = 0; i < 3; i++)
            g.fillCircle(palmX + 9 + i * 8, palmY + side * (i + 2) * 4, 1.6 + i * .4);
        }
      }
    } else {
      const progress = attacking ? (t < .3 ? -t / .3 :
        t < .65 ? -1 + (t - .3) / .35 * 2.5 :
          1.5 - (t - .65) / .35 * 1.25) : -.08;
      const handX = 16 + Math.cos(progress) * 13, handY = -10 + Math.sin(progress) * 17 + sway * .2;
      g.lineStyle(8, sleeve, 1); g.lineBetween(8, -10, handX, handY);
      g.lineStyle(3, icy, .84); g.lineBetween(10, -12, handX - 2, handY - 1);
      g.fillStyle(0xd2f6ff); g.fillCircle(handX, handY, 5.5);
      const holdsSpike = !attacking || t < .39;
      if (holdsSpike) {
        g.fillStyle(0x9ce8ff, .95);
        g.fillTriangle(handX + 25, handY, handX + 4, handY - 5, handX + 4, handY + 5);
        g.fillStyle(0xffffff, .9);
        g.fillTriangle(handX + 19, handY, handX + 6, handY - 2.1, handX + 6, handY + 2.1);
      }
      if (attacking && t >= .25 && t < .75) {
        const alpha = Math.sin(Math.PI * (t - .25) / .5);
        g.lineStyle(2.7, edge, alpha);
        g.lineBetween(handX - 11, handY - 13, handX + 17, handY);
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(handX + 21, handY, 3);
      }
    }
  }

  /** Pyromancer: a long, two-handed ember staff rises, swings and ignites.
   * Projectiles still spawn from WeaponController at the normal fire cadence. */
  private drawEmberStaff(g: Phaser.GameObjects.Graphics, attacking: boolean,
    t: number, sway: number, now: number): void {
    const a = attacking ? (t < .28 ? -.45 - t * 2.35 :
      t < .72 ? -1.108 + (t - .28) / .44 * 1.65 :
        .542 - (t - .72) / .28 * .96) : -.34 + sway * .022;
    const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    const hx = 18, hy = -10 + sway * .25;
    const tx = hx + dx * 57, ty = hy + dy * 57;
    g.lineStyle(9, 0x883b1c); g.lineBetween(8, -10, hx, hy);
    g.lineStyle(8, 0xb45c24); g.lineBetween(13, 11, hx + dx * 12, hy + dy * 12);
    g.fillStyle(0xffc78b); g.fillCircle(hx, hy, 5.4);
    g.fillCircle(hx + dx * 12, hy + dy * 12, 4.2);
    g.lineStyle(9, 0x43231c); g.lineBetween(hx - dx * 8, hy - dy * 8, tx, ty);
    g.lineStyle(4, 0xfac06f); g.lineBetween(hx + dx * 9, hy + dy * 9, tx - dx * 3, ty - dy * 3);
    for(let i=0;i<3;i++){
      const q=20+i*9;
      g.lineStyle(2,0xffdc92,.95);
      g.lineBetween(hx+dx*q+px*5,hy+dy*q+py*5,
        hx+dx*q-px*5,hy+dy*q-py*5);
    }
    g.fillStyle(0x4d2031); g.fillCircle(tx,ty,11);
    g.lineStyle(3,0xffb84f);g.strokeCircle(tx,ty,11);
    g.fillStyle(0xffe29c);g.fillCircle(tx,ty,6);
    const flicker = Math.sin(now * .025) * 3;
    const f = attacking ? Math.max(.15, Math.sin(Math.PI * Math.min(1,t))) : .28;
    g.fillStyle(0xff6525,.76);
    g.fillTriangle(tx+dx*(12+f*12+flicker),ty+dy*(12+f*12+flicker),
      tx+px*9,ty+py*9,tx-px*9,ty-py*9);
    g.fillStyle(0xffef9d,.9);
    g.fillTriangle(tx+dx*(9+f*6),ty+dy*(9+f*6),
      tx+px*4,ty+py*4,tx-px*4,ty-py*4);
    if(attacking){
      g.lineStyle(3,0xffa647,f*.8);
      g.strokeCircle(tx,ty,14+f*14);
      for(let i=0;i<5;i++){
        const angle=i*Math.PI*2/5+now*.002, d=19+f*19;
        g.fillStyle(i%2?0xffeb87:0xfb6c22,f*.9);
        g.fillCircle(tx+Math.cos(angle)*d,ty+Math.sin(angle)*d,2.4);
      }
    }
  }

  /** The weapon is a short inferno nozzle with two moving wrists. A held attack
   * channels visibly for as long as the real conical flame hitbox is active. */
  private drawFlamethrower(g: Phaser.GameObjects.Graphics, active: boolean,
    t: number, sway: number, now: number): void {
    const extension = active ? 5 + t * 7 : 0;
    const x = 27 + extension, y = sway * .3;
    for (const side of [-1, 1]) {
      const sy = side * 13;
      g.lineStyle(9,0x8f311c,1);
      g.lineBetween(9,sy,x-4,side*(7+t*2));
      g.lineStyle(3,0xffaa61,.9);
      g.lineBetween(12,sy,x-4,side*(7+t*2));
      g.fillStyle(0xf8b67b); g.fillCircle(x-4,side*(7+t*2),5);
    }
    g.fillStyle(0x372332);g.fillRoundedRect(x-9,y-9,31,18,5);
    g.lineStyle(2.6,0xffad52);g.strokeRoundedRect(x-9,y-9,31,18,5);
    g.fillStyle(0xfea037);g.fillRoundedRect(x+12,y-8,12,16,4);
    g.lineStyle(2,0xffe5a1);g.lineBetween(x+22,y-7,x+22,y+7);
    if(active){
      const glow=.6+.4*Math.sin(now*.022);
      g.fillStyle(0xff5a20,.8*glow);
      g.fillTriangle(x+51,y,x+22,y-15,x+22,y+15);
      g.fillStyle(0xffe8a4,.91);
      g.fillTriangle(x+37+t*8,y,x+22,y-5,x+22,y+5);
      g.lineStyle(2,0xffb84a,glow*.8);
      g.strokeCircle(x+27,y,12+t*7);
      for(let i=0;i<4;i++){
        const offset=((now*.06+i*13)%44);
        g.fillStyle(i%2?0xffdb72:0xff7840,.75*(1-offset/50));
        g.fillCircle(x+26+offset, y+Math.sin(now*.01+i*2)*8,2+i%2);
      }
    }
  }

  /** Storm Wand: wrist snaps forward, the forked tip discharges branching arcs. */
  private drawStormWand(g: Phaser.GameObjects.Graphics, active: boolean,
    t: number, sway: number, now: number): void {
    const swing=active ? (t<.4 ? -.65 + t*2.0 : .15 - (t-.4)*.75) : -.42+sway*.021;
    const dx=Math.cos(swing),dy=Math.sin(swing),px=-dy,py=dx;
    const hx=20,hy=-8+sway*.2, tipX=hx+dx*41,tipY=hy+dy*41;
    g.lineStyle(8,0x215bb0);g.lineBetween(10,-12,hx,hy);
    g.fillStyle(0xf4d8a2);g.fillCircle(hx,hy,5);
    g.lineStyle(7,0x203c62);g.lineBetween(hx,hy,tipX,tipY);
    g.lineStyle(2.5,0xf4f59b);g.lineBetween(hx+dx*8,hy+dy*8,tipX,tipY);
    g.lineStyle(3,0xfde047);
    g.lineBetween(tipX,tipY,tipX+dx*8+px*9,tipY+dy*8+py*9);
    g.lineBetween(tipX,tipY,tipX+dx*8-px*9,tipY+dy*8-py*9);
    g.fillStyle(0xc8fbff);g.fillCircle(tipX,tipY,6);
    if(active){
      const flash=Math.sin(Math.PI*t);
      for(const side of [-1,1]){
        const spread=(now*.015)%7;
        g.lineStyle(2.6,side<0?0xffffff:0x67e8f9,flash);
        g.lineBetween(tipX,tipY,tipX+dx*(13+spread)+px*side*9,
          tipY+dy*(13+spread)+py*side*9);
        g.lineBetween(tipX+dx*(13+spread)+px*side*9,tipY+dy*(13+spread)+py*side*9,
          tipX+dx*30+px*side*6,tipY+dy*30+py*side*6);
      }
      g.lineStyle(2,0xe0faff,flash*.8);g.strokeCircle(tipX,tipY,8+flash*12);
    }
  }

  /** Tempest Spear is a real two-handed physical thrust, with its point
   * travelling in the same forward direction as the existing narrow melee arc. */
  private drawStormLance(g: Phaser.GameObjects.Graphics, active: boolean,
    t: number, sway: number, now: number): void {
    const reach=active ? (t<.35 ? -9+t/.35*37 :
      t<.68 ? 28 : 28-(t-.68)/.32*28) : 0;
    const hx=17+reach,hy=3+sway*.2;
    for(const side of [-1,1]){
      const sy=side*11,px=hx-(side===1?7:0),py=side*3;
      g.lineStyle(9,0x234db0);g.lineBetween(8,sy,px,py);
      g.lineStyle(3,0xadeaff,.8);g.lineBetween(10,sy,px,py);
      g.fillStyle(0xf5d6a3);g.fillCircle(px,py,4.8);
    }
    const tipX=hx+53,tipY=hy;
    g.lineStyle(8,0x243b59);g.lineBetween(hx-17,hy,tipX,tipY);
    g.lineStyle(3,0xffe17b);g.lineBetween(hx-5,hy,tipX,tipY);
    g.fillStyle(0xe4faff);
    g.fillTriangle(tipX+20,tipY,tipX-2,tipY-9,tipX-2,tipY+9);
    g.lineStyle(3,0xfacc15);
    g.lineBetween(tipX-6,tipY-8,tipX+11,tipY-2);
    g.lineBetween(tipX-6,tipY+8,tipX+11,tipY+2);
    if(active&&t<.8){
      const strength=Math.sin(Math.PI*t/.8);
      const wiggle=Math.sin(now*.03)*4;
      g.lineStyle(3,0x8bebff,strength);
      g.lineBetween(hx+8,hy-10,tipX-5,tipY-12+wiggle);
      g.lineBetween(hx+8,hy+10,tipX-5,tipY+12-wiggle);
      g.fillStyle(0xffffff,strength);
      g.fillCircle(tipX+20,tipY,3.5);
    }
  }

  /** Abyss Orb: palms orbit around a heavy void sphere, then thrust it out.
   * The existing projectile remains the only source of collision/damage. */
  private drawAbyssOrb(g: Phaser.GameObjects.Graphics, active: boolean,
    t: number, sway: number, now: number): void {
    const push=active ? (t<.42 ? t/.42*17 :
      t<.7 ? 17 : 17-(t-.7)/.3*17) : 0;
    const cx=37+push,cy=sway*.2;
    for(const side of [-1,1]){
      const handX=cx-12,handY=side*(12+push*.15);
      g.lineStyle(9,0x5b2488);g.lineBetween(7,side*10,handX,handY);
      g.lineStyle(3,0xb581d8,.88);g.lineBetween(11,side*10,handX,handY);
      g.fillStyle(0xc6a1c4);g.fillCircle(handX,handY,5.5);
    }
    const phase=now*.004, amplitude=active?1.15+.28*Math.sin(Math.PI*t):.9;
    g.fillStyle(0x1c0c36,.91);g.fillCircle(cx,cy,13*amplitude);
    g.lineStyle(3,0xc084fc,.92);g.strokeCircle(cx,cy,13*amplitude);
    g.fillStyle(0x7c3aed,.75);g.fillCircle(cx,cy,8*amplitude);
    g.fillStyle(0xf5d0fe,.88);g.fillCircle(cx+3,cy-2,3);
    for(let i=0;i<4;i++){
      const a=phase+i*Math.PI/2,r=17+(active?Math.sin(Math.PI*t)*8:0);
      g.fillStyle(i%2?0xe9d5ff:0x8b5cf6,.9);
      g.fillCircle(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2.2);
    }
    if(active&&t>.22&&t<.83){
      const glow=Math.sin((t-.22)/.61*Math.PI);
      g.lineStyle(2.7,0xe9baff,glow*.85);
      g.strokeCircle(cx,cy,19+glow*17);
      g.lineBetween(cx-22-glow*12,cy-13,cx-32-glow*12,cy-13);
      g.lineBetween(cx-22-glow*12,cy+13,cx-32-glow*12,cy+13);
    }
  }

  /** A physically swinging, curved Shadow Scythe: both arms follow the shaft,
   * and a wide purple crescent flashes along the real melee swing. */
  private drawShadowScythe(g: Phaser.GameObjects.Graphics, active: boolean,
    t: number, sway: number): void {
    const angle=active ? -1.45 + (1-Math.cos(Math.PI*Math.min(1,t)))*1.23
      : -.45+sway*.015;
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const hx=19,hy=0+sway*.17, tipX=hx+dx*56,tipY=hy+dy*56;
    for(const side of [-1,1]){
      g.lineStyle(9,0x4b1d74);
      g.lineBetween(9,side*12,hx+dx*(side===1?11:0),hy+dy*(side===1?11:0));
      g.fillStyle(0xc6a4b9);
      g.fillCircle(hx+dx*(side===1?11:0),hy+dy*(side===1?11:0),4.4);
    }
    g.lineStyle(8,0x281739);g.lineBetween(hx-dx*12,hy-dy*12,tipX,tipY);
    g.lineStyle(3,0xc084fc);g.lineBetween(hx+dx*9,hy+dy*9,tipX,tipY);
    // The hook and long lethal crescent are drawn at the *moving* tip.
    g.lineStyle(11,0x582488,.95);
    g.beginPath();g.arc(tipX,tipY,24,angle-1.6,angle+.7,false);g.strokePath();
    g.lineStyle(5,0xf0caff,1);
    g.beginPath();g.arc(tipX,tipY,25,angle-1.6,angle+.7,false);g.strokePath();
    g.fillStyle(0xf3d5ff);
    g.fillTriangle(tipX+Math.cos(angle-1.6)*32,tipY+Math.sin(angle-1.6)*32,
      tipX+Math.cos(angle-1.6)*15,tipY+Math.sin(angle-1.6)*15,
      tipX+Math.cos(angle-1.9)*29,tipY+Math.sin(angle-1.9)*29);
    if(active){
      const fade=Math.sin(Math.PI*t);
      g.lineStyle(7,0x8b5cf6,fade*.47);
      g.beginPath();g.arc(hx,hy,64,angle-.55,angle+.24,false);g.strokePath();
      g.lineStyle(2,0xe9d5ff,fade*.95);
      g.beginPath();g.arc(hx,hy,66,angle-.5,angle+.22,false);g.strokePath();
    }
  }

  /** Room changes cancel current poses but keep the same weapon renderer alive. */
  public reset(): void {
    this.activePose = null;
    this.channeling = false;
    this.started = -100000;
    this.graphics.clear();
  }

  public destroy(): void {
    if(this.destroyed)return;
    this.destroyed=true;
    this.graphics.destroy();
  }
}

import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { WeaponId } from '../weapons/weaponConfig';
import { hasAnimatedHero } from './heroEquipmentArt';

export type AttackPose = 'sword' | 'hammer' | 'bow' | 'crossbow' | 'shotgun';
export const poseForWeapon = (weapon: WeaponId): AttackPose | null =>
  weapon === 'sunblade' ? 'sword' : weapon === 'warhammer' ? 'hammer'
    : weapon === 'bow' ? 'bow' : weapon === 'crossbow' ? 'crossbow' : null;

export function poseLengthMs(pose: AttackPose, attackIntervalMs: number): number {
  const base = pose === 'hammer' ? 440 : pose === 'sword' ? 200 :
    pose === 'crossbow' ? 175 : pose === 'shotgun' ? 210 : 145;
  return pose === 'hammer' ? Math.max(220, Math.min(base, attackIntervalMs * .78))
    : Math.max(75, Math.min(base, attackIntervalMs * .78));
}

/** Fixed 135ms hammer anticipation: impact and actual hitbox occur together. */
export const HAMMER_IMPACT_DELAY_MS = 135;

/** Pure timed pose for exact, repeatable animations at any frame-rate. */
export function attackPoseProgress(now: number, started: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(now)) return 1;
  return Phaser.Math.Clamp((now - started) / duration, 0, 1);
}

export class CharacterAttackArt {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly pose: AttackPose | null;
  private started = -100000;
  private duration = 100;
  private activePose: AttackPose | null = null;
  private destroyed = false;

  public constructor(private readonly scene: Phaser.Scene,
    private readonly player: Player, weaponId: WeaponId) {
    this.pose = hasAnimatedHero(player.heroId) ? poseForWeapon(weaponId) : null;
    this.graphics = scene.add.graphics().setDepth(24);
    if (!this.pose) this.graphics.setVisible(false);
  }

  public begin(now: number, attackIntervalMs: number, pose: AttackPose | null = this.pose): void {
    if (!pose || this.destroyed) return;
    this.activePose = pose;
    this.started = now;
    this.duration = poseLengthMs(pose, attackIntervalMs);
    this.update(now);
  }

  /** One reusable Graphics object, attached to the moving/rotating sprite every frame. */
  public update(now: number): void {
    if (this.destroyed || !this.graphics.active || !this.pose || !this.player.active) return;
    const g = this.graphics;
    const hasAttack = this.activePose !== null && now < this.started + this.duration;
    const pose = hasAttack ? this.activePose! : this.pose;
    const t = hasAttack ? attackPoseProgress(now, this.started, this.duration) : 1;
    const velocity = this.player.body instanceof Phaser.Physics.Arcade.Body
      ? this.player.body.velocity.length() : 0;
    const sway = velocity > 15 ? Math.sin(now * .018) * 1.3 : 0;
    g.clear();
    g.setPosition(this.player.x, this.player.y);
    g.setRotation(this.player.rotation);
    if(pose==='sword')this.drawSword(g,hasAttack,t,sway);
    else if(pose==='hammer')this.drawHammer(g,hasAttack,t,sway);
    else if(pose==='bow'||pose==='crossbow'||pose==='shotgun')
      this.drawRanged(g,pose,hasAttack,t,sway);
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
    g.fillStyle(0x34485b,1);g.fillPoints(corners,true);
    g.lineStyle(3,0xfde68a,1);g.strokePoints(corners,true);
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

  /** Room changes cancel current poses but keep the same weapon renderer alive. */
  public reset(): void {
    this.activePose = null;
    this.started = -100000;
    this.graphics.clear();
  }

  public destroy(): void {
    if(this.destroyed)return;
    this.destroyed=true;
    this.graphics.destroy();
  }
}

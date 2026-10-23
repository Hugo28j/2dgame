import {describe, expect, it} from 'vitest';
import {RUN_UPGRADES, RunUpgradeDeck, scaleRunWeaponDamage} from '../src/progression/runUpgrades';

describe('all power-up choices have defined gameplay applications', () => {
  it('includes the full 12-card set without duplicates or dead stack limits', () => {
    expect(RUN_UPGRADES).toHaveLength(12);
    expect(new Set(RUN_UPGRADES.map(card => card.id)).size).toBe(12);
    expect(RUN_UPGRADES.every(card => card.maxStacks > 0)).toBe(true);
  });
  it('offers only melee-relevant or projectile-relevant cards', () => {
    const melee = new RunUpgradeDeck(() => 0);
    for (let i=0;i<12;i++) {
      const offered=melee.offer(true, 'melee');
      expect(offered.every(card=>card.id!=='projectile'&&card.id!=='piercing')).toBe(true);
      if(!offered.length)break;
      offered.forEach(card=>melee.choose(card.id));
    }
    const ranged = new RunUpgradeDeck(() => .999);
    for (let i=0;i<12;i++) {
      const offered=ranged.offer(true, 'projectile');
      expect(offered.every(card=>card.id!=='meleeRange'&&card.id!=='meleeStun')).toBe(true);
      if(!offered.length)break;
      offered.forEach(card=>ranged.choose(card.id));
    }
  });
  it('scales entire weapon damage by fifteen percent per sharp-strikes stack', () => {
    const baseWeapon=45, baseHero=8;
    for(let stacks=1;stacks<=4;stacks++){
      const result=scaleRunWeaponDamage(baseWeapon,baseHero*Math.pow(1.15,stacks),stacks);
      expect(result).toBeCloseTo((baseWeapon+baseHero)*Math.pow(1.15,stacks));
    }
  });
  it('preserves one-time epic limits and stack caps for every power-up', () => {
    for(const card of RUN_UPGRADES){
      const deck=new RunUpgradeDeck();
      for(let i=0;i<card.maxStacks;i++)expect(deck.choose(card.id)).toBe(true);
      expect(deck.choose(card.id)).toBe(false);
      expect(deck.count(card.id)).toBe(card.maxStacks);
    }
  });
});

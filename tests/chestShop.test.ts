import { describe, expect, it } from 'vitest';
import { ARMOR_RARITIES, armorDefinition } from '../src/progression/armor';
import { defaultProfile, applyProfileAction } from '../src/progression/ProgressStore';
import {
  SHOP_CHESTS, chestEligibleHeroes, chestRarity, getShopChest,
  rollChestArmor,
} from '../src/ui/shopCatalog';

describe('chest economy and published drop rates', () => {
  it('uses exactly three chests with increasing gold costs and valid rarity odds', () => {
    expect(SHOP_CHESTS.map(c => c.id)).toEqual(['small','medium','large']);
    expect(SHOP_CHESTS.map(c => c.cost)).toEqual([100,350,950]);
    for (const c of SHOP_CHESTS) {
      expect(ARMOR_RARITIES.reduce((sum, rarity) => sum + c.odds[rarity], 0)).toBe(100);
      expect(getShopChest(c.id)).toEqual(c);
      expect(c.odds.legendary).toBeGreaterThan(0);
    }
    expect(SHOP_CHESTS[0]!.odds.legendary).toBeLessThan(SHOP_CHESTS[1]!.odds.legendary);
    expect(SHOP_CHESTS[1]!.odds.legendary).toBeLessThan(SHOP_CHESTS[2]!.odds.legendary);
  });

  it('selects the exact advertised weighted rarity across all percentile rolls', () => {
    for (const chest of SHOP_CHESTS) {
      const counts = Object.fromEntries(ARMOR_RARITIES.map(r => [r,0]));
      for (let roll=0; roll<10000; roll++) {
        const rarity = chestRarity(chest, (roll+.5)/10000)!;
        counts[rarity] = (counts[rarity] ?? 0)+1;
      }
      for (const rarity of ARMOR_RARITIES) {
        expect(counts[rarity]).toBe(chest.odds[rarity] * 100);
      }
    }
  });

  it('limits armor rewards to UNLOCKED heroes and allows all nine armor kinds and slots', () => {
    const chest = SHOP_CHESTS[0]!;
    expect(chestEligibleHeroes(['guardian','guardian'])).toEqual(['guardian']);
    for (let i=0;i<9;i++) {
      const item = rollChestArmor(chest,['guardian','mage'], {
        rarity:.5, hero:0, kind:(i+.1)/9,
      },'chest-test-' + i + '-12345')!;
      expect(item.heroId).toBe('guardian');
      expect(armorDefinition(item).slot).toBe(['helm','body','boots'][Math.floor(i/3)]);
    }
    expect(rollChestArmor(chest,['guardian','mage'],
      {rarity:.6,hero:.9,kind:.75},'chest-test-mage-12345')?.heroId).toBe('mage');
    expect(rollChestArmor(chest,[],{rarity:0,hero:0,kind:0},'chest-test-empty-12345'))
      .toBeNull();
    expect(rollChestArmor(chest,['guardian'],{rarity:1,hero:0,kind:0},
      'chest-test-invalid-12345')).toBeNull();
  });

  it('spends gold and grants the reward ATOMICALLY in the same save', () => {
    const profile=defaultProfile();
    const action = {type:'openChest' as const, chestId:'small' as const,
      itemId:'chest-test-one-123456',rolls:{rarity:.998,hero:0,kind:.5}};
    const next=applyProfileAction(profile,action);
    expect(next.gold).toBe(50);
    expect(next.armorInventory).toHaveLength(1);
    expect(next.armorInventory[0]?.rarity).toBe('legendary');
    expect(next.armorInventory[0]?.heroId).toBe('guardian');
    expect(next.armorInventory[0]?.stars).toBe(0);
    expect(next.armorInventory[0]?.level).toBe(1);
    expect(applyProfileAction(next,action)).toEqual(next);
  });

  it('does not charge for poor balance, full inventory, malformed rolls or duplicate IDs', () => {
    const profile=defaultProfile();
    const request={type:'openChest' as const, chestId:'medium' as const,
      itemId:'chest-test-m-123456',rolls:{rarity:0,hero:0,kind:0}};
    expect(applyProfileAction(profile,request)).toEqual(profile);
    const missingRoll={...request,chestId:'small' as const,
      rolls:{rarity:Number.NaN,hero:0,kind:0}};
    expect(applyProfileAction(profile,missingRoll)).toEqual(profile);
    const malformed={...request,chestId:'small' as const,itemId:'bad'};
    expect(applyProfileAction(profile,malformed)).toEqual(profile);
    const existing=applyProfileAction(profile,{...request,chestId:'small'});
    expect(existing.armorInventory).toHaveLength(1);
    const dup=applyProfileAction({...existing,gold:1000}, {...request,chestId:'small'});
    expect(dup.gold).toBe(1000);
    expect(dup.armorInventory).toHaveLength(1);
    const filled = Array.from({length:250}, (_,i) => ({...existing.armorInventory[0]!,id:'armor-full-'+i}));
    const full=applyProfileAction({...profile,armorInventory:filled},
      {...request,chestId:'small'});
    expect(full.armorInventory).toHaveLength(250);
    expect(full.gold).toBe(profile.gold);
  });
});

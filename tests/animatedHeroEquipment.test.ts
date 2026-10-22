import { describe, expect, it } from 'vitest';
import { armorDefinition, rollEnemyArmor } from '../src/progression/armor';
import { resolveHeroWardrobe, wardrobeKey, hasAnimatedHero } from '../src/heroes/heroEquipmentArt';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';

describe('visible Guardian and Ranger equipment', () => {
  it('only outfits the first two heroes, leaving other heroes unchanged', () => {
    expect(hasAnimatedHero('guardian')).toBe(true);
    expect(hasAnimatedHero('ranger')).toBe(true);
    for (const hero of ['mage','frostblade','pyromancer','stormstrider','voidwalker'] as const)
      expect(hasAnimatedHero(hero)).toBe(false);
  });

  it('resolves only pieces currently equipped by the matching hero', () => {
    const gHelm = rollEnemyArmor('boss', 0, 0, 0, 'run', 'g', 'guardian')!;
    const rHelm = rollEnemyArmor('boss', 0, .99, 0, 'run', 'r', 'ranger')!;
    const base = defaultProfile();
    const p = { ...base, unlockedHeroes: ['guardian','ranger'] as
      typeof base.unlockedHeroes, armorInventory: [gHelm, rHelm] };
    let equipped = applyProfileAction(p, { type:'equipArmor', id:gHelm.id });
    equipped = applyProfileAction(equipped, { type:'equipArmor', id:rHelm.id });
    const guardian = resolveHeroWardrobe('guardian', equipped.equippedArmor.guardian,
      equipped.armorInventory);
    const ranger = resolveHeroWardrobe('ranger', equipped.equippedArmor.ranger,
      equipped.armorInventory);
    expect(guardian[armorDefinition(gHelm).slot]?.id).toBe(gHelm.id);
    expect(ranger[armorDefinition(rHelm).slot]?.id).toBe(rHelm.id);
    expect(wardrobeKey('guardian',guardian)).not.toBe(wardrobeKey('ranger',ranger));
    const forged = {...equipped.equippedArmor.guardian, helm:rHelm.id};
    expect(resolveHeroWardrobe('guardian',forged,equipped.armorInventory).helm).toBeNull();
  });

  it('looks change by kind and rarity, not level/stars, and disappear when unequipped', () => {
    const first = rollEnemyArmor('boss',0,0,0,'run','one','guardian')!;
    const alt = { ...first, kind: 'guardian-hunter-hood', rarity: 'epic' as const, id:'two' };
    const equipped = { helm:first.id,body:null,boots:null };
    const look1=resolveHeroWardrobe('guardian',equipped,[first,alt]);
    const look2=resolveHeroWardrobe('guardian',equipped,[{...first,level:30,stars:5},alt]);
    expect(wardrobeKey('guardian',look1)).toBe(wardrobeKey('guardian',look2));
    const look3=resolveHeroWardrobe('guardian',{...equipped,helm:alt.id},[first,alt]);
    expect(wardrobeKey('guardian',look1)).not.toBe(wardrobeKey('guardian',look3));
    const noGear=resolveHeroWardrobe('guardian',{helm:null,body:null,boots:null},[first]);
    expect(noGear).toEqual({helm:null,body:null,boots:null});
  });
});

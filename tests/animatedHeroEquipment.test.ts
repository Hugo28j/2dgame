import { describe, expect, it } from 'vitest';
import { armorDefinition, rollEnemyArmor } from '../src/progression/armor';
import { resolveHeroWardrobe, wardrobeKey, hasAnimatedHero } from '../src/heroes/heroEquipmentArt';
import { applyProfileAction, defaultProfile } from '../src/progression/ProgressStore';

describe('visible armor on all seven heroes', () => {
  it('outfits all seven playable heroes, including the final three', () => {
    for (const hero of ['guardian','ranger','mage','frostblade',
      'pyromancer','stormstrider','voidwalker'] as const)
      expect(hasAnimatedHero(hero)).toBe(true);
  });

  it('renders the final three heroes with distinct owned helm, body and boots', () => {
    for (const heroId of ['pyromancer','stormstrider','voidwalker'] as const) {
      const helmet = rollEnemyArmor('boss',0,0,0,'test','h-'+heroId,heroId)!;
      const body = { ...helmet, kind: heroId + '-iron-vest', id: 'body-'+heroId };
      const boots = { ...helmet, kind: heroId + '-runner-treads', id: 'boots-'+heroId,
        rarity: 'legendary' as const };
      const pieces = [helmet, body, boots];
      const selected = {helm:helmet.id,body:body.id,boots:boots.id};
      const outfit=resolveHeroWardrobe(heroId,selected,pieces);
      expect(outfit.helm?.id).toBe(helmet.id);
      expect(outfit.body?.id).toBe(body.id);
      expect(outfit.boots?.id).toBe(boots.id);
      expect(wardrobeKey(heroId,outfit)).not.toBe(
        wardrobeKey(heroId,resolveHeroWardrobe(heroId,
          {...selected,helm:null},pieces)));
      const other = heroId === 'pyromancer' ? 'stormstrider' : 'pyromancer';
      expect(resolveHeroWardrobe(other,selected,pieces))
        .toEqual({helm:null,body:null,boots:null});
    }
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
  it('shows all three equipped slots for Mage and Frostblade independently', () => {
    for (const heroId of ['mage','frostblade'] as const) {
      const helm = rollEnemyArmor('boss', 0, 0, 0, 'run', heroId + '-h', heroId)!;
      const body = { ...helm, kind: heroId + '-bulwark-plate', id: heroId + '-b' };
      const boots = { ...helm, kind: heroId + '-wind-boots', id: heroId + '-s',
        rarity: 'legendary' as const };
      const equipped = { helm: helm.id, body: body.id, boots: boots.id };
      const all = [helm, body, boots];
      const dressed = resolveHeroWardrobe(heroId, equipped, all);
      expect(dressed.helm?.id).toBe(helm.id);
      expect(dressed.body?.id).toBe(body.id);
      expect(dressed.boots?.id).toBe(boots.id);
      const noBoots = resolveHeroWardrobe(heroId, { ...equipped, boots: null }, all);
      expect(wardrobeKey(heroId, dressed)).not.toBe(wardrobeKey(heroId, noBoots));
      const wrongHero = heroId === 'mage' ? 'frostblade' : 'mage';
      expect(resolveHeroWardrobe(wrongHero, equipped, all))
        .toEqual({ helm: null, body: null, boots: null });
    }
  });

});

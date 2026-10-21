# Fase 10 — eindcontrole wereld 1 en 2

## Scope en eerlijke teststatus

Deze audit is uitgevoerd op de Phaser/TypeScript-broncode. De nieuwe automatische
regressietest `tests/phase10TwoWorldsAudit.test.ts` controleert **alle 30
kamers van wereld 1 en alle 30 kamers van wereld 2** met concrete room-, spawn-,
mob-, progressie- en bossdata. De aanvullende test
`tests/phase10GolemSplits.test.ts` controleert dat de Snow Sentinel-bossfight
geen onbedoelde splitscascade produceert.

**Let op:** een simulatie van spelregels is **geen echte 60-kamer-playthrough in
een browser**. Voor de finale visuele en mobiele acceptatie is een volledige
manuele testrun op laptop en echte smartphone nodig. De GitHub Actions-workflow
voert `npm run validate` uit (typecheck, Vitest, Vite productiebuild); hij draait
geen browser met handmatige touch-input, meet geen FPS en bewijst geen speelbalans.

## Uitgevoerde codecontrole

| Controle | Geautomatiseerd / code | Browser nodig? |
| --- | --- | --- |
| Beide werelden kamers 1–30, spawncount en arena-bounds | 60 parametrische tests | Ja: speelbaarheid |
| Geen spawn in obstakels of bovenop held; minimumafstand | 60 parametrische tests | Ja: verplaatsing tijdens gevecht |
| Start van alle normale en bosskamers: geplande vijanden | 60 parametrische tests | Ja: juiste render/AI |
| Elke kamer van 1 t/m 30 kan in RoomProgress afsluiten | 2 volledige logicasimulaties | Ja: fysieke deur, kamerwissel |
| Alle bossrooms 5/10/15/20/25/30: beide aanvalsfases | Bossprofielen en patroonopbouw | Ja: volledige gevechten |
| Wereld 1 kamer 20: Gunner + exact twee Sentinels | State-, killcount- en schaderegels | Ja: wind/groei/explosie, knoppen |
| Wereld 2 kamer 15: Sentinel en Golem-summons | Progressie + nieuwe uitsluitingsregels | Ja: summonfrequentie en FPS |
| Spore-poison en Heart-tree overlappende reserves | Deterministische plaatsingscontroles | Ja: visuals versus hitboxes |
| HP-weergave afronden naar geheel getal | Unit test | Ja: uitrusting / negatieve damage |
| Bestaande v3 savegame naar v4 en werelden | Unit test | Ja: echte lokale browseropslag |
| IJsbeweging, knockback en blocked axes | Bestaande ijs-tests | Ja: nauwkeurige besturing |
| Endscreen/HOME click-geometrie | Bestaande layouttests | Ja: echte taps en klikken |
| Ability-upgrades, cooldowns, Rune Tome, combo | Bestaande tests fases 7–9 | Ja: echt richten/vuren |
| Scene-cleanup van boss-effecten en projectielen | Code-inspectie, bestaande tests | Ja: stress, FPS en geheugen |

## Opgeloste regressies

1. **Snow Sentinel / Glacier Golem (wereld 2, kamer 15):** opgeroepen
   `sentinel-golem-*`-vijanden worden niet langer behandeld als normale
   splitsende ijsreuzen. Normale world-2 tanks behouden wel hun bedoelde
   splitsgedrag. Dit voorkomt verborgen extra Snow Puffs, bossfight-verlenging
   en extra renderlast.
2. **Whiteout versus Ancient Treant:** Whiteout houdt naast oorspronkelijk
   geraakte enemies ook de werkelijk geraakte schade-ontvangers bij. Meerdere
   beschutte vijanden kunnen hetzelfde Treant-schild niet langer meerdere keren
   met één en dezelfde ijsstofgolf beschadigen.

## Nog handmatig te testen vóór definitieve 'afgewerkt'-goedkeuring

1. **Desktop:** speel wereld 1 kamers 1–30, vervolgens wereld 2 kamers 1–30.
   Voorzie in elk bossgevecht een HP-proef voor fase 1 en fase 2; test deur en
   reload op kamernummers 5, 10, 15, 20, 25, 30.
2. **Wereld 1, kamer 10:** Root Tyrant: waarschuwingslijn, groeiende wortel
   en drie volle fase-2-rotaties met 0,8s tussenruimte.
3. **Wereld 1, kamer 15:** Spore Alchemist: bewegende boss, worp, individuele
   poison-cirkels, geen overlap, 1,5s levensduur, damage niet buiten de circle.
4. **Wereld 1, kamer 20:** Bramble Gunner: tijdens cutscene geen damage, geen
   touch/keyboard-input, windburst zonder schade; na explosie precies twee
   Sentinels met gescheiden positie, juiste healthbars, bediening terug.
5. **Wereld 1, kamers 25/30:** extra groeiende Jade-takken en groeiende bomen
   van Heart of Grove; controleren op onzichtbare hitboxes en ontbrekende warnings.
6. **Wereld 2, kamer 15:** dood alle opgeroepen Golems en Snow Sentinel; deur
   opent zonder ongeplande Puffs. Test ook vele summons voor FPS/performance.
7. **Wereld 2, alle kamers:** hero en enemies glijden, muren stoppen beweging,
   geen doorschieten of te sterke cameratrilling; speciale ijsprojectielen.
8. **Gsm:** virtuele joysticks met twee vingers, abilityknoppen, camera-FIT,
   kamers en menus; deathscreen en winscreen HOME aanraken en correcte route.
9. **Load/performance:** maximaal aantal mobs, de spiraal van de twee Bloom
   Sentinels, sneeuwstorm, ijsstof/poison/bom-burst; controleer framerate en
   objecten uit vorige kamer met browser Performance/Memory-profiel.
10. **Savegame:** vóór spelen een kopie van localStorage bewaren, na reload
    held, bewapening, armor, abilitylevels en wereld 2 unlock verifiëren.

## CI

```bash
npm ci
npm run validate
```

Een groene build en unit-testset zijn vereist voor het samenvoegen. Een
performancecijfer of geslaagde volledige browser-playthrough wordt niet
geclaimd zolang die niet echt op de betreffende apparaten is uitgevoerd.

# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Hotfixes na fase 8

- Desktop: WASD en ZQSD werken allebei, ook diagonaal. Muis + linkermuisknop blijft richten en schieten.
- Phaser Arcade Physics Groups overschrijven de initiële velocity van een nieuw projectiel. Zowel speler- als vijandschoten krijgen hun snelheid daarom opnieuw **nadat** ze aan de groep zijn toegevoegd.
- Reguliere schoten verdwijnen bij een treffer op een muur of vijand; bestaande piercing-wapens/upgrades blijven doelbewust meerdere vijanden kunnen doorboren tot hun hitlimiet. Vijandelijke schoten verdwijnen bij een botsing met muur of speler.
- Vijanden krijgen na toevoegen aan de Physics Group expliciet botsing met kamergrenzen, ook tijdens boss charges.

## Instelbare besturing en vernieuwd menu

- Het hoofdmenu is opnieuw ingedeeld met heldere kaarten voor helden, wapens, upgrades en instellingen, met een prominente speelknop.
- Open **Opties → Toetsenbord & besturing** en klik op een toets naast een actie. Druk daarna op de nieuwe toets; **Escape** annuleert.
- Zowel beweging als Dash, Fire Nova en Ice Blast kunnen worden aangepast. Standaard werken WASD én ZQSD, met vaardigheden op 1, 2 en 3.
- Een reeds toegewezen toets wordt niet zonder waarschuwing overgenomen. Gebruik **Standaardtoetsen herstellen** om uitsluitend de besturing te herstellen.
- Toetsinstellingen worden met het profiel in de browser opgeslagen. Oude savebestanden blijven leesbaar. Op mobiel werken de joysticks en skillknoppen ongewijzigd.

## Uitbreiding naar 50 kamers en tien unieke bossen

- De dungeon bevat 50 kamers; elke vijfde kamer is een aparte bossfight (kamers 5 t.e.m. 50).
- Alle tien bossen hebben een eigen gevechtsprofiel en onderscheiden fase-1/fase-2-aanvallen. Onder meer mitrailleurvuur, spiraalvormige kogels, draaiende ringen en telegraphed bommenvelden.
- Bosses groeien per kamer/tier in HP en schade. Gewone vijanden blijven met de kamers meegroeien.
- De speler kan om de twee gewone, even kamers een tijdelijke upgrade kiezen, zodat het langere avontuur ook upgrades biedt.
- Desktop: stel zowel toetsenbordtoetsen als muisknoppen 1–5 in via **Opties → Besturing**. Zelfs de vuurknop kan worden verplaatst. Mobiele sticks en skillknoppen blijven werken.
- Een toets/muisknop kan maar voor één actie tegelijk worden gebruikt. Oude profielopslag wordt gemigreerd zonder je voortgang te wissen.

## Progressieve vijanden en scrollende kamers

- **Camera scrolling**: vanaf grotere kamers volgt de camera het personage. De wereld is groter dan het 390×844-scherm; de mobiele joysticks, abilities en HUD blijven op vaste schermposities.
- **Geleidelijk nieuwe vijanden**: kamers 1–6 (behalve de boss op 5) bevatten alleen slimes. Boogschutters komen op kamer 7, chargers op 12, tanks op 17, mages op 23 en bombers op 29. Na introductie neemt hun aandeel toe.
- **Groeiende groepsgrootte**: gewone kamers beginnen met 3 vijanden, groeien gemiddeld elke 3 kamers en tellen richting het einde maximaal 20 vijanden. Bosskamers blijven één boss per vijf kamers.
- **Negen kamerpatronen** met zuilen, ruïnes, gangen, altaren, een open arena, enz. Obstakels en spawns worden per kamer binnen de actuele grenzen geplaatst; vijanden staan niet op obstakels of vlak bij je spawn.
- **Variabele afmetingen**: breedte en hoogte groeien trapsgewijs tot ver boven de zichtbare viewport. De camera en dynamische physics-grenzen passen zich bij elke kamer aan; kogels despawnen pas voorbij de échte kamerrand of hun eigen bereik.
- De grafische sfeer en bestaande 50 kamers, bossen, besturing en opslag blijven behouden.

## Uitgebreide kamerpatronen en herstel na kamers

- **21 verschillende kamerpatronen** (12 nieuwe boven op de bestaande 9), met verschillende opstellingen van losstaande pilaren, ruïnes, hallen, tempels, poorten en crypten. Alle 21 verschijnen tijdens een volledige campagne van 50 kamers; bosskamers houden hun open arena zodat speciale aanvallen ontwijkbaar zijn.
- Kamerbreedte, camerascrolling, vijandspawns en obstakelbeveiliging blijven werken. Nieuwe layout-elementen mogen de speler niet insluiten en vijanden mogen niet in obstakels verschijnen.
- **HP-herstel bij het leegmaken van een kamer**: iedere voltooide kamer herstelt 6% van maximale HP, plus 1 procentpunt per 10 kamers voortgang (tot 10% bij kamer 41–50). Elke derde kamer komt daar 8 procentpunten bij, en elke vijfde (bosskamer) nog eens 14 procentpunten.
- Het totale herstel per kamer is maximaal 30% van de maximale HP en stopt bij de maximale HP. Een verslagen speler wordt niet hersteld.
- Een groene melding bij kamer-clear toont de werkelijk herstelde HP. Je bestaande **Herstel +35 HP**-keuze op de upgrade-kaarten blijft behouden.
- Het herstel wordt precies één keer toegekend wanneer een kamer voor het eerst wordt voltooid; wachten of opnieuw door een geopende deur lopen levert niets extra's op.

## Spawn-golven en onmiddellijke Game Over

- Het aantal vijanden groeit van 3 aan het begin tot **31 in kamer 49**. Bosskamers bevatten nog altijd één unieke boss.
- Vijanden starten vanaf latere kamers steeds verder van de oorspronkelijke speler-spawn (tot minimaal 340 gamepixels); locaties liggen buiten obstakels en zijn verspreid over de grote arena.
- Vanaf kamer 11 verschijnen ze in **gespreide golven**: de eerste groep is kleiner; extra groepen verschijnen op afstand van de **actuele positie van de speler**. De maximale hoeveelheid tegelijk actieve vijanden wordt begrensd, zodat late kamers uitdagender worden zonder alle vijanden op één frame te maken.
- Wanneer HP nul wordt, wordt de vorige spelscene meteen in slaap gezet en het **Game Over-scherm direct gestart**. De zware cleanup van vijanden, projectielen en timers volgt pas nadat het eerste resultatenframe kan worden weergegeven. Het hoofdmenu en Opnieuw spelen blijven beschikbaar.
- Goud/voortgang wordt bij het einde van de run nog steeds maar één keer opgeslagen.

## Munten oprapen met magnetische aantrekking

- **Elke vijand laat gouden munten vallen op zijn sterfplek.** Gewone vijanden droppen één munt (Slime/Archer = 2 goud, Charger/Mage/Bomber = 3 goud, Tank = 4 goud); een boss laat vijf munten van 5 goud vallen (= 25 goud).
- Munten bewegen naar je toe wanneer je binnen **180 wereldpixels** komt, en worden verzameld als ze dichtbij genoeg zijn. Loop dus langs de verslagen vijanden om ze op te rapen.
- Alleen **opgeraapte** munten tellen mee voor de run en het resultaat na overlijden of winnen. Kills en het voltooien van een kamer geven geen automatische gold rewards meer.
- Niet-opgeraapte munten worden bij het verlaten van de kamer weggehaald en tellen niet mee. De run-HUD toont hoeveel munten nog in de huidige kamer liggen.
- Goudwaarden zijn bewust lager dan de vorige 5/9/90 goud per kill, en de extra beloning van 20 + 3 × kamernummer (+ bossbonus) per kamer is verwijderd. Bestaande profielen/goudsaldo blijven ongewijzigd.

## Huidige fase

Fase 8 – Progressie en economie:

- Alle fase-7-vijanden, vier bosskamers, boss-fases, eerlijke dash-waarschuwingen en originele projectile patterns.
- Alleen opgeraapte munten van verslagen vijanden tellen mee als run-goud; bij overlijden of winnen wordt dat bedrag precies eenmaal aan je permanente balans toegevoegd.
- Een apart Game Over / Chapter Complete scherm toont kamer, kills, damage, beloningen, blijvende goudbalans en je tijdelijke upgrades.
- Je bestaande hero- en wapenniveaus blijven bestaan. Vijf globale permanente upgrade-tracks (HP, damage, defense, wapenschade en aanvalssnelheid) komen erbij.
- Na kamer 2, 4, 7, 10, 13, 16 en 19 kies je één van drie tijdelijke run-upgrades. Bij een volgende run begin je zonder tijdelijke bonussen.
- SaveManager v2 valideert en migreert oude lokale v1-savebestanden, bewaart persoonlijke records en ondersteunt reset na bevestiging.

De audio-instellingen zijn voorbereid; geluid en definitieve sprites volgen in fase 9. De eerste versie gebruikt geen online accounts of aankopen.

## Lokaal starten

Vereist: Node.js 24 of nieuwer.

```bash
npm ci
npm run dev
```

Open daarna de lokale URL die Vite toont.

## Controlecommando's

```bash
npm run typecheck
npm test
npm run build
npm run validate
```

## GitHub Pages

Na het mergen naar `main` valideert de workflow het project en publiceert hij de map `dist`. Stel in de repository bij **Settings → Pages → Source** eenmalig **GitHub Actions** in als publicatiebron.

De productiebuild gebruikt het basispad `/2dgame/`, passend bij:

`https://hugo28j.github.io/2dgame/`

## Projectstructuur

```text
src/
├── abilities/  # actieve vaardigheden, cooldowns en HUD
├── config/     # spelconfiguratie en constanten
├── combat/     # centrale schaderekening
├── enemies/    # vijandconfiguratie, spawning en AI-modules
├── entities/   # Phaser-gameobjecten zoals de speler
├── heroes/     # hero-definities, stats en passieve eigenschappen
├── progression/# voortgang, aankopen en lokale opslag
├── input/      # joysticks, pointer ownership en invoerlogica
├── rooms/      # layouts, difficulty scaling en kamerprogressie
├── scenes/     # Phaser-scenes
├── weapons/    # wapenconfiguratie en aanvalmodules
├── main.ts     # applicatie-entrypoint
└── style.css   # mobiele pagina- en safe-area-stijlen
tests/          # geautomatiseerde tests
public/assets/  # toekomstige originele of gelicentieerde assets
.github/        # CI en GitHub Pages
```

De overige domeinmappen worden toegevoegd wanneer hun ontwikkelfase begint, zodat de repository geen lege architectuur zonder implementatie bevat.

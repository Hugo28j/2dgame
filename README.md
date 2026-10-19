# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Hotfixes na fase 8

- Desktop: WASD en ZQSD werken allebei, ook diagonaal. Muis + linkermuisknop blijft richten en schieten.
- Phaser Arcade Physics Groups overschrijven de initiële velocity van een nieuw projectiel. Zowel speler- als vijandschoten krijgen hun snelheid daarom opnieuw **nadat** ze aan de groep zijn toegevoegd.
- Reguliere schoten verdwijnen bij een treffer op een muur of vijand; bestaande piercing-wapens/upgrades blijven doelbewust meerdere vijanden kunnen doorboren tot hun hitlimiet. Vijandelijke schoten verdwijnen bij een botsing met muur of speler.
- Vijanden krijgen na toevoegen aan de Physics Group expliciet botsing met kamergrenzen, ook tijdens boss charges.

## Huidige fase

Fase 8 – Progressie en economie:

- Alle fase-7-vijanden, vier bosskamers, boss-fases, eerlijke dash-waarschuwingen en originele projectile patterns.
- Goud voor vijanden, kamers en bosses wordt tijdens een run bijgehouden. Bij overlijden of winnen wordt het precies eenmaal aan je permanente balans toegevoegd.
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

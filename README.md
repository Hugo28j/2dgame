# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Huidige fase

Fase 6 – Active abilities:

- **Dash (1)**: korte, gerichte versnelling in de beweegrichting (of laatste aim), met 140 ms contactbescherming. Botsingen met muren en obstakels blijven actief.
- **Fire Nova (2)**: directe cirkelvormige aanval rond de speler, met schade via het centrale damage-systeem.
- **Ice Blast (3)**: cirkelvormige aanval die Slimes schade geeft en de overlevenden tijdelijk vertraagt.
- Drie touchknoppen boven de rechter joystick, tegelijk te gebruiken met beide joysticks (Phaser multitouch).
- Desktopbediening met toetsen 1, 2, 3; de bestaande WASD/muisbesturing blijft behouden.
- Per ability een eigen cooldown, aangepast aan de geselecteerde hero; blokkering tijdens cooldown of bij game over.
- Zichtbare countdowns en gekleurde cooldown-ringen, bijbehorende visuele effecten.
- Cooldowns lopen op Phaser-speltijd door tussen kamers en worden niet gepasseerd bij een nieuw vertrek uit een kamer.
- Unit tests voor cooldowns, dash-vectoren en area-of-effect targeting.

**Dit is fase 6;** extra vijandtypes en de echte boss volgen in fase 7.
De volledige goud/run-economie en uitgebreide savevoorzieningen volgen in fase 8.

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

# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Huidige fase

Fase 1 – Speler en bediening:

- eenvoudige arena met Arcade Physics-wereldgrenzen;
- tijdelijke, richtinggevoelige spelerssprite;
- linker virtuele joystick voor analoge beweging;
- rechter virtuele joystick voor 360-graden richten;
- onafhankelijk finger ownership voor beide joysticks;
- reset bij loslaten, pointer cancellation, focusverlies en verborgen tab;
- WASD-beweging en muisrichting voor desktoptests;
- genormaliseerde diagonale beweging;
- responsive portretweergave met safe-area-ondersteuning.

Schieten, projectielen, abilities, schade en vijanden horen bij latere fasen en zijn bewust nog niet toegevoegd.

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
├── config/     # spelconfiguratie en constanten
├── entities/   # Phaser-gameobjecten zoals de speler
├── input/      # joysticks, pointer ownership en invoerlogica
├── scenes/     # Phaser-scenes
├── main.ts     # applicatie-entrypoint
└── style.css   # mobiele pagina- en safe-area-stijlen
tests/          # geautomatiseerde tests
public/assets/  # toekomstige originele of gelicentieerde assets
.github/        # CI en GitHub Pages
```

De overige domeinmappen worden toegevoegd wanneer hun ontwikkelfase begint, zodat de repository geen lege architectuur zonder implementatie bevat.

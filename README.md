# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Huidige fase

Fase 2 – Schieten en basiscombat:

- alle speler- en bedieningsfuncties uit fase 1;
- continu boogschieten via de rechter joystick;
- richten met de muis en schieten met de linkermuisknop;
- configureerbaar wapen met fire rate, damage, snelheid, crit en piercing;
- projectielen die verdwijnen bij een muur of niet-piercende treffer;
- centraal damage-systeem met defense en critical hits;
- statische oefendoelen met HP-balk, hitflash, damage numbers en death-feedback;
- unit tests voor damage, fire rate en bescherming tegen dubbele treffers.

Volledige vijand-AI, abilities, kamerprogressie en permanente upgrades horen bij latere fasen.

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
├── combat/     # centrale schaderekening
├── entities/   # Phaser-gameobjecten zoals de speler
├── input/      # joysticks, pointer ownership en invoerlogica
├── scenes/     # Phaser-scenes
├── weapons/    # wapenconfiguratie en aanvalmodules
├── main.ts     # applicatie-entrypoint
└── style.css   # mobiele pagina- en safe-area-stijlen
tests/          # geautomatiseerde tests
public/assets/  # toekomstige originele of gelicentieerde assets
.github/        # CI en GitHub Pages
```

De overige domeinmappen worden toegevoegd wanneer hun ontwikkelfase begint, zodat de repository geen lege architectuur zonder implementatie bevat.

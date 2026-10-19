# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Huidige fase

Fase 5 – Heroes en wapensysteem:

- selecteer Ranger, Mage of Guardian in een nieuw hoofdmenu;
- drie visueel verschillende heroes met eigen stats en passieve kenmerken;
- Bow, Crossbow, Magic Staff, Daggers en Lightning Wand met eigen aanvalspatronen;
- sneller/meervoudig vuur, piercing, korte afstand, magische damage en chain lightning;
- afzonderlijke hero- en wapenupgrades (maximaal level 20);
- ontgrendelen, selecteren en upgraden via het hoofdmenu;
- basale goudbeloning bij het voltooien van kamers om de aankopen te testen;
- lokale opslag van keuzes en upgrades via een gevalideerd versieerbaar profiel;
- fase-4-kamers, Slimes en joysticks blijven bestaan.

De volwaardige run-economie, beloningsschermen en uitgebreid savebeleid volgen in fase 8.
Abilities volgen in fase 6; extra vijanden en bosses in fase 7.

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

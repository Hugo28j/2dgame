# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Huidige fase

Fase 4 – Kamersysteem en deuren:

- twintig opeenvolgende kamers per hoofdstuk;
- vier herbruikbare kamerindelingen met muren en obstakels;
- veilige, vooraf gedefinieerde speler- en vijandspawns;
- meerdere Slimes per kamer;
- een gesloten deur die alleen na alle geplande kills opent;
- laden van de volgende kamer wanneer de speler de geopende deur bereikt;
- behoud van huidige speler-HP tussen kamers;
- configureerbare scaling van vijandaantal, HP en damage;
- ieder vijfde kamernummer is gereserveerd als bosskamer-slot;
- eenvoudige obstacle avoidance voor Slimes;
- projectielen verdwijnen bij een obstakel.

Echte bosses, extra vijandtypes, abilities, hero-selectie, permanente upgrades en saves horen bij latere fasen.

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

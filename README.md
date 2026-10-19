# Dungeon Ascent

Dungeon Ascent wordt een originele, mobile-first 2D roguelike shooter voor de browser. Het project gebruikt Phaser, TypeScript en Vite en wordt in afzonderlijk geteste ontwikkelfases opgebouwd.

## Huidige fase

Fase 7 – Vijanden en bossgevechten:

- Moss Slime, Thorn Archer, Rush Beetle (Charger), Rune Wisp (Mage), Stone Brute (Tank) en Blast Shroom (Bomber) met verschillende AI en eigen stats;
- afstandsschoten, ontwijken/straffen, charges met visuele waarschuwing, en ontploffingen met een zichtbaar gevarengebied;
- één echte boss in kamer 5, 10, 15 en 20 (vier unieke namen), met een boss-HP-balk en snellere, zwaardere aanvallen vanaf 50% HP;
- vijandelijke projectielen botsen met speler en muren en gebruiken het centrale damage-systeem;
- bestaande wapens, Dash, Fire Nova, Ice Blast, invulnerability frames en kamerprogressie blijven behouden;
- tests voor vijandselectie, stats, bosskamers en bewegingshelpers.

De volledige beloningseconomie volgt in fase 8; de visuele en audio-afwerking in fase 9.

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

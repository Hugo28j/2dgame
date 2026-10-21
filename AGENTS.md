# Dungeon Ascent – ontwikkelregels

## Werkwijze

- Werk strikt in de afgesproken fasevolgorde.
- Implementeer uitsluitend de fase die de gebruiker expliciet heeft gevraagd.
- Inspecteer bestaande code voordat je bestanden wijzigt.
- Houd configuratie gescheiden van uitvoerende code.
- Voeg geen ongevraagde functies toe.
- Gebruik compacte, gerichte commits en een pull request voor grotere wijzigingen.
- Publiceer geen halfwerkende code.
- Voer na iedere wijziging minimaal `npm run validate` uit.
- Rapporteer eerlijk welke controles daadwerkelijk zijn uitgevoerd.

## Technische basis

- Phaser met Arcade Physics.
- TypeScript met strict type checking.
- Vite voor ontwikkeling en productiebuilds.
- Mobile-first portraitweergave met ondersteuning voor desktoptests.
- Lokale gameplay en browseropslag; geen backend in de eerste versie.
- Modulaire broncode onder `src/`.

## Huidige status

- De implementatiefases 1–9 staan op `main`.
- Fase 10 voert een regressie-audit uit van wereld 1 en 2 (elk 30 kamers).
- De geautomatiseerde status en de lijst van **nog vereiste handmatige browser- en
  mobiele tests** staan in [docs/phase-10-qa.md](docs/phase-10-qa.md).
- Geef nooit aan dat een 60-kamer-playthrough op een echte smartphone/laptop of
  een FPS-stresstest is geslaagd op basis van alleen Vitest of een groene build.

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

- Actieve status: **fase 8 afgerond + heldgebonden loadouts, abilities en vernieuwde hero-art**.
- Volgende geplande fase na afzonderlijke goedkeuring: **fase 9 – Visuele afwerking**.

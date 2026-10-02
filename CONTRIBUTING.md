# Meewerken aan Klokit

Zo werken we samen aan de code. Lees dit één keer door, daarna kun je het gebruiken als naslag.

## In het kort

1. Pak een ticket in Linear en zet het op **In Progress**.
2. Maak een branch: `git switch -c clo-12-korte-omschrijving`.
3. Bouw het, **met tests**.
4. Draai de controles lokaal (zie hieronder).
5. Open een pull request naar `Development` met `CLO-12` in de titel.
6. CI moet groen zijn en één teamlid moet goedkeuren.

## Branches

| Branch | Waarvoor |
| --- | --- |
| `main` | Wat live staat. Alleen via een pull request vanuit `Development`. |
| `Development` | Waar het werk samenkomt. Hier mergen feature-branches naartoe. |
| `clo-<nummer>-<omschrijving>` | Jouw werk aan één ticket. |

Werk nooit rechtstreeks in `main` of `Development`.

## Commits

We gebruiken [Conventional Commits](https://www.conventionalcommits.org/). Dat leest prettig terug en maakt een changelog later makkelijk.

```
feat(mobile): toon afstand tot de werkzone op het inklokscherm
fix(api): voorkom dubbel inklokken binnen dezelfde minuut
test(backend): dek de 16-uursgrens in toSpan af
chore(deps): vitest naar 5.0.4
```

Veelgebruikte types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`.

Zet het Linear-ticket in de titel of de omschrijving van je pull request (`CLO-12`), dan koppelt Linear het automatisch.

## Controles die je lokaal draait

Doe dit **voordat** je een pull request opent. Precies dezelfde controles draaien in CI, dus wat hier faalt, faalt daar ook.

In het onderdeel dat je hebt aangeraakt (`backend/`, `frontend/` of `mobile/`):

```bash
npm run lint
npm run typecheck
npm test
```

En als je logica hebt toegevoegd of gewijzigd:

```bash
npm run test:coverage
```

### Alleen in de API

De integratietests praten met een echte MySQL. Zorg dat die draait (`npm run start:local` in de hoofdmap zet hem op) en draai dan:

```bash
cd backend
npm run test:integration
```

De eerste keer heeft je MySQL-gebruiker rechten nodig op de testdatabase:

```sql
GRANT ALL PRIVILEGES ON `clockit_test`.* TO 'clockit'@'localhost';
GRANT CREATE, DROP ON *.* TO 'clockit'@'localhost';
FLUSH PRIVILEGES;
```

## Tests schrijven

**Elke pull request met nieuwe logica heeft tests.** De dekking moet op **80%** blijven; de testconfiguratie faalt onder die grens, zowel op je eigen machine als in CI.

| Onderdeel | Gereedschap | Waar de tests staan |
| --- | --- | --- |
| API | Vitest + supertest | naast de code (`src/geo.test.ts`) en in `tests/integration/` |
| Website | Vitest + Testing Library | naast de code (`src/api.test.ts`) |
| App | jest-expo + Testing Library | naast de code (`src/lib/format.test.ts`) |

Een paar gewoontes die het makkelijker maken:

- **Houd logica los van de randen.** Rekenwerk hoort in een eigen bestand zonder database of netwerk; dat test je in een paar regels. Zie `backend/src/geo.ts` en `mobile/src/lib/format.ts`.
- **Geef tijd mee als parameter.** Functies die `new Date()` zelf aanroepen zijn niet te testen. Daarom hebben `toSpan` en `summarize` een `now`-argument.
- **Test wat de gebruiker merkt**, niet hoe het intern werkt. Bij de website betekent dat zoeken op zichtbare tekst, niet op klassenamen.
- **Laat geen rommel achter.** De integratietests zetten de werkzone van het demo-restaurant vóór elke test terug (`tests/integration/setup.ts`), zodat de volgorde van tests niet uitmaakt.

## Lint-waarschuwingen

Lint faalt op fouten, niet op waarschuwingen. Een paar regels staan bewust op *waarschuwing* omdat bestaande code ze overtreedt; die ruimen we per ticket op. Welk ticket waar bij hoort, staat in [docs/BACKLOG.md](docs/BACKLOG.md).

Zet een regel niet uit om je eigen code erdoor te krijgen. Los het op, of overleg het in het ticket.

## Opmaak

```bash
npm run format
```

Dit is **niet** verplicht en CI controleert het niet, zodat je niet per ongeluk het hele bestand herschrijft in een kleine pull request.

## Pull requests

- Houd ze klein. Eén ticket, één pull request.
- Vul de checklist in het sjabloon in.
- Voeg een schermafbeelding toe bij wijzigingen aan de website of de app.
- Zet hem op *draft* zolang je nog bezig bent.

## Wat nooit in de code komt

- Wachtwoorden, tokens, API-sleutels. Die horen in GitHub-secrets of in je eigen `.env` (die staat in `.gitignore`).
- Echte persoonsgegevens in testdata.
- `console.log` die je was vergeten weg te halen.

## Geheimen in CI

| Secret | Waarvoor | Waar je hem haalt |
| --- | --- | --- |
| `CODECOV_TOKEN` | dekkingsrapporten uploaden | https://app.codecov.io → repo → Settings |
| `EXPO_TOKEN` | de app bouwen via EAS | https://expo.dev/settings/access-tokens |

Instellen: **Settings › Secrets and variables › Actions › New repository secret**.

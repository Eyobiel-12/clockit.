# Backlog

Tickets die klaarstaan om in Linear te zetten. Elk blok is één ticket: titel, omschrijving en de punten waaraan je ziet dat het klaar is.

Projectvoorvoegsel: **KLK**. Houd de nummers aan die hier staan, want er wordt vanuit de code naar verwezen (bijvoorbeeld in `mobile/eslint.config.js`).

---

## Nu op te pakken

### KLK-1 — Branch protection op `main` en `Development`

**Type:** Chore · **Prioriteit:** Urgent · **Schatting:** 1

De pijplijn is er, maar zolang iedereen rechtstreeks naar `main` kan pushen doet hij niets. Zet de regels aan in GitHub.

**Klaar als:**

- [ ] `main` en `Development` vereisen een pull request
- [ ] De check **CI geslaagd** is verplicht
- [ ] Minimaal 1 goedkeuring, en de goedkeuring vervalt bij een nieuwe push
- [ ] Branches moeten bij zijn met de doelbranch voor de merge
- [ ] Rechtstreeks pushen en force-push staan uit

---

### KLK-2 — Geheimen instellen in GitHub

**Type:** Chore · **Prioriteit:** Urgent · **Schatting:** 1

Zonder deze twee waarden slaat CI stappen over of faalt de app-build.

**Klaar als:**

- [ ] `CODECOV_TOKEN` staat onder Settings › Secrets and variables › Actions
- [ ] `EXPO_TOKEN` staat er ook (van https://expo.dev/settings/access-tokens)
- [ ] Een testrun van CI laat zien dat de dekking in Codecov binnenkomt voor alle drie de onderdelen
- [ ] Het oude Codecov-token is ingetrokken, want dat is in een chat geplakt

---

### KLK-3 — EAS koppelen aan het project

**Type:** Chore · **Prioriteit:** Hoog · **Schatting:** 2

`mobile/eas.json` staat klaar, maar de app heeft nog geen EAS-project-id, dus `mobile-release.yml` kan nog niet draaien.

**Klaar als:**

- [ ] `npx eas-cli@latest init` is gedraaid in `mobile/`
- [ ] `extra.eas.projectId` staat in `mobile/app.json` en is gecommit
- [ ] Een handmatige run van **Mobile release** met profiel `preview` levert een installeerbare Android-apk
- [ ] De README beschrijft hoe je die build op je telefoon zet

---

## Testdekking uitbreiden

### KLK-4 — Integratietests voor team, rooster en instellingen

**Type:** Test · **Prioriteit:** Hoog · **Schatting:** 5

`auth` en `shifts` zijn gedekt. De andere routes nog niet, en juist daar zitten de rolcontroles.

**Klaar als:**

- [ ] `tests/integration/team.test.ts`: uitnodigen, rol wijzigen, verwijderen, en dat een medewerker dat allemaal níét mag
- [ ] `tests/integration/timesheet.test.ts`: uren per week/maand/dag, teamtotaal, CSV-export
- [ ] `tests/integration/corrections.test.ts`: aanvragen, goedkeuren, tijd aanpassen, afwijzen
- [ ] `tests/integration/restaurant.test.ts`: werkzone opslaan, straalgrenzen 25–300 m, klokregels
- [ ] Alle tests draaien in willekeurige volgorde zonder elkaar te storen

---

### KLK-5 — De drempel van 80% over alle broncode

**Type:** Test · **Prioriteit:** Normaal · **Schatting:** 8

De dekking wordt nu gemeten over een lijst van bestanden die tests hébben. Dat houdt de drempel eerlijk, maar het verbergt wat nog ongetest is. Doel: de lijsten weg, de drempel over alles.

**Klaar als:**

- [ ] `include` in `backend/vitest.config.ts` is vervangen door `src/**/*.ts`
- [ ] `include` in `frontend/vitest.config.ts` is vervangen door `src/**/*.{ts,tsx}`
- [ ] `collectCoverageFrom` in `mobile/jest.config.js` is vervangen door `src/**/*.{ts,tsx}`
- [ ] Alle drie de onderdelen halen 80% op regels, statements, functies en vertakkingen
- [ ] De opmerking over de "lijst uitbreiden" is uit alle drie de bestanden verdwenen

> Dit is groot. Hak het in Linear op in sub-tickets per onderdeel.

---

### KLK-6 — Tests voor de schermen van de website

**Type:** Test · **Prioriteit:** Normaal · **Schatting:** 5

De API-laag is gedekt, de schermen niet.

**Klaar als:**

- [ ] Inloggen: goede gegevens, foute gegevens, foutmelding in beeld
- [ ] Registreren: eigenaar en medewerker met code, validatie per veld
- [ ] Dashboard: wie werkt er nu, en de waarschuwing als er geen werkzone is
- [ ] Instellingen: werkzone opslaan, straal buiten 25–300 m wordt geweigerd
- [ ] De tests zoeken op zichtbare tekst en rollen, niet op klassenamen

---

### KLK-7 — Tests voor de schermen van de app

**Type:** Test · **Prioriteit:** Normaal · **Schatting:** 5

**Klaar als:**

- [ ] Inklokscherm: knop in/uit, lopende tijd, melding "Buiten zone"
- [ ] Correctie aanvragen: formulier invullen en versturen
- [ ] Werkzone aanpassen: pin verplaatsen en opslaan
- [ ] `expo-location` en `expo-secure-store` worden gemockt in `jest.setup.js`

---

## Code opruimen

### KLK-8 — Toegankelijkheid van de website op orde

**Type:** Chore · **Prioriteit:** Normaal · **Schatting:** 3

Biome vindt 36 waarschuwingen in `frontend/`, waarvan 18 over toegankelijkheid. Ze staan nu op *waarschuwing* zodat de rest van de lint wél hard faalt. Los ze op en zet ze terug op *fout*.

| Regel | Aantal | Wat er speelt |
| --- | --- | --- |
| `useValidAnchor` | 5 | `<a>` zonder `href`, of met `href="#"` — dat hoort een `<button>` te zijn |
| `useSemanticElements` | 5 | `role="group"` kan `<fieldset>` zijn |
| `noNoninteractiveElementToInteractiveRole` | 3 | een `role` op een element dat daar niet voor bedoeld is |
| `useAriaPropsSupportedByRole` | 2 | `aria-*` die bij die rol niet bestaat |
| `useFocusableInteractive` | 1 | aanklikbaar maar niet bereikbaar met Tab |
| `useButtonType` | 1 | `<button>` zonder `type` verstuurt per ongeluk het formulier |
| `noStaticElementInteractions` | 1 | `onClick` op een `<div>` |

**Klaar als:**

- [ ] Alle 18 waarschuwingen zijn opgelost
- [ ] Het blok met a11y-uitzonderingen is uit `frontend/biome.json`
- [ ] Je kunt het hele inlogproces met alleen het toetsenbord doorlopen
- [ ] `npm run lint` in `frontend/` geeft geen fouten en geen a11y-waarschuwingen

---

### KLK-9 — De React Compiler-regels in de app

**Type:** Chore · **Prioriteit:** Normaal · **Schatting:** 3

`expo lint` meldt 5 overtredingen van `react-hooks/set-state-in-effect` en `react-hooks/purity`. Ze staan op *waarschuwing* in `mobile/eslint.config.js`. De patronen werken, maar ze gaan wringen zodra de React Compiler aangaat.

**Klaar als:**

- [ ] De data-hooks halen hun gegevens zonder `setState` in een `useEffect`
- [ ] Het blok met uitzonderingen is uit `mobile/eslint.config.js`
- [ ] `npm run lint` in `mobile/` geeft 0 fouten en 0 waarschuwingen
- [ ] Inklokken, het overzicht en het team werken nog gewoon op een telefoon

---

### KLK-10 — Waarschuwingen over `useExhaustiveDependencies` en `noArrayIndexKey`

**Type:** Chore · **Prioriteit:** Laag · **Schatting:** 3

De overige 18 waarschuwingen in `frontend/`: 11 over ontbrekende afhankelijkheden in `useEffect`, 7 over `key={index}` in lijsten. Allebei stille bronnen van bugs.

**Klaar als:**

- [ ] De `useEffect`-afhankelijkheden kloppen, zonder de regel per regel uit te zetten
- [ ] Lijsten gebruiken een stabiele `key` (een id uit de database)
- [ ] Beide regels staan weer op `error` in `frontend/biome.json`

---

## Pijplijn afmaken

### KLK-11 — Automatisch uitrollen naar een testomgeving

**Type:** Feature · **Prioriteit:** Normaal · **Schatting:** 5

`release.yml` zet de images in ghcr.io, maar daarna gebeurt er niets. Zorg dat een merge naar `main` ook echt ergens landt.

**Klaar als:**

- [ ] Er is een server of hostingpartij gekozen en vastgelegd in de README
- [ ] Een merge naar `main` rolt de nieuwe images automatisch uit
- [ ] De migraties draaien bij het opstarten
- [ ] `/api/health` wordt na de uitrol gecontroleerd en bij een fout gaat de vorige versie terug
- [ ] De omgevingsvariabelen staan als geheimen, niet in de repo

---

### KLK-12 — Controle op kwetsbare pakketten

**Type:** Chore · **Prioriteit:** Normaal · **Schatting:** 2

Dependabot stelt updates voor, maar niemand kijkt naar bekende lekken.

**Klaar als:**

- [ ] Er is een wekelijkse workflow die `npm audit --audit-level=high` draait in alle drie de onderdelen
- [ ] Hij faalt bij `high` of `critical`
- [ ] CodeQL staat aan voor JavaScript en TypeScript
- [ ] Een gevonden probleem maakt automatisch een issue aan

---

### KLK-13 — Dekkingsbadges in de README

**Type:** Chore · **Prioriteit:** Laag · **Schatting:** 1

**Klaar als:**

- [ ] Een CI-badge bovenaan de README
- [ ] Een Codecov-badge per onderdeel (backend, frontend, mobile)
- [ ] De badges verwijzen naar de juiste repo en flags

---

## Zo zet je dit in Linear

1. Maak een team **Klokit** met voorvoegsel `KLK`.
2. Maak de labels: `bug`, `feature`, `test`, `chore`, `ci`.
3. Maak de tickets in de volgorde hierboven, zodat de nummers kloppen met de verwijzingen in de code.
4. Zet KLK-1 tot en met KLK-3 in de eerste cyclus; die blokkeren de rest.
5. Koppel GitHub aan Linear (Settings › Integrations › GitHub), dan sluit `KLK-12` in een pull-requesttitel het ticket bij de merge.

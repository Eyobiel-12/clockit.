# Klokit

Urenregistratie voor restaurants: medewerkers klokken in met GPS op hun telefoon, de eigenaar ziet op de website en in de app wie er werkt.

- **Website** (React): homepage, inloggen, registreren, dashboard, team, instellingen
- **App** (Expo, iPhone en Android): inklokken, overzicht, team, werkzone
- **API** (Node + Express) met een **MySQL**-database, alles in Docker

---

## Snel starten: stap voor stap

### Stap 0: Dit heb je nodig (eenmalig installeren)

| Wat | Waarvoor | Downloaden | Controleren |
| --- | --- | --- | --- |
| **Git** | de code ophalen | https://git-scm.com/downloads | `git --version` |
| **Node.js 22 (LTS)** | de pakketten en de app | https://nodejs.org | `node -v` (moet 20 of hoger zijn) |
| **Docker Desktop** | database, API en website | https://www.docker.com/products/docker-desktop/ | `docker --version` |
| **Expo Go** (op je telefoon) | de app testen | App Store / Google Play: zoek "Expo Go" | – |

Na het installeren van Docker Desktop: open het één keer en wacht tot er *Engine running* staat.

### Stap 1: Code ophalen

Open **PowerShell** en ga naar de map waar je het project wilt hebben:

```powershell
cd C:\Users\<jouw-naam>\Develop
git clone https://github.com/Eyobiel-12/clockit..git clockit
cd clockit
```

> Het laatste woord `clockit` is de mapnaam. Laat je die weg, dan heet de map `clockit.` (met een punt), en dat werkt slecht op Windows.

### Stap 2: Pakketten installeren

```powershell
npm run setup
```

Dit controleert Node.js en Docker en installeert alle pakketten voor de website, de API en de app (`npm install` in `frontend/`, `backend/` en `mobile/`). Duurt de eerste keer een paar minuten.

### Stap 3: Docker Desktop openen

Start Docker Desktop en wacht tot het klaar is. (Vergeet je dit, dan probeert `npm start` het zelf te openen.)

### Stap 4: Alles starten

```powershell
npm start
```

Of korter: `.\start`. (Alleen `start` typen werkt niet: in PowerShell is dat een ingebouwd commando.)

Dit doet in één keer:

1. controleert of Docker draait (en start Docker Desktop als dat nodig is);
2. start de **database** en de **API** in Docker (de eerste keer bouwen duurt een paar minuten) en de **website** met Vite: elke wijziging in `frontend/` zie je meteen in de browser, zonder herstarten;
3. wacht tot de API klaar is;
4. opent de website in je browser;
5. start de **Expo-app** en toont de **QR-code** in de terminal.

Aan het eind zie je zoiets:

```
Klokit draait
  Website      http://localhost:8090
  API          http://localhost:4000/api  (telefoon: http://192.168.x.x:4000/api)
  Database     localhost:3307  (clockit / clockit)
  Inloggen     sanne@dekade.nl / wachtwoord12

  ▄▄▄▄▄▄▄ ▄ ▄ ▄ ▄ ▄ ▄▄▄▄▄▄▄     ← QR-code voor de app
  exp://192.168.x.x:8081
```

### Stap 5: Website openen en inloggen

Ga naar **http://localhost:8090** en log in met het demo-account:

| E-mail | Wachtwoord | Rol |
| --- | --- | --- |
| `sanne@dekade.nl` | `wachtwoord12` | Eigenaar van Eetcafé De Kade |
| `mehmet@mail.nl` | `wachtwoord12` | Manager |
| `joost@mail.nl` | `wachtwoord12` | Medewerker |

Uitnodigingscode voor nieuwe medewerkers: **482913**.

### Stap 6: De app op je telefoon

1. Zorg dat je telefoon op **hetzelfde wifi-netwerk** zit als je computer.
2. **iPhone:** open de **Camera**-app en richt op de QR-code in de terminal. Tik op de melding: de app opent in Expo Go.
   **Android:** open **Expo Go** en tik op *Scan QR code*.
3. Log in met hetzelfde demo-account.

De eerste keer vraagt Windows misschien of Node.js het netwerk mag gebruiken: kies **Toestaan** (privénetwerk).

### Stap 7: Inklokken testen

Het demo-restaurant staat in Amsterdam, dus vanaf jouw plek krijg je eerst "Buiten zone". Zo zet je het restaurant op jouw locatie:

1. Log in als eigenaar (`sanne@dekade.nl`).
2. **App:** tik op **Meer › Werkzone aanpassen** › *Pin op mijn locatie* › **Opslaan**.
   **Of website:** **Instellingen › Werkzone** › *Pin op mijn locatie* › **Wijzigingen opslaan**.
3. Ga naar **Overzicht** in de app en tik op **Inklokken**. Sta de locatie toe als je telefoon daarom vraagt.

### Stoppen

- `Ctrl+C` in de terminal stopt de website en de app-server (Expo).
- `npm run stop` stopt ook de database en API (Docker). Je gegevens blijven bewaard.

---

## Handige commando's

Allemaal uitvoeren in de hoofdmap van het project.

| Commando | Wat het doet |
| --- | --- |
| `npm run setup` | Pakketten installeren (eenmalig, of na een `git pull` met nieuwe pakketten) |
| `npm start` | Alles starten en de QR-code voor de app tonen |
| `npm run stop` | Docker stoppen (gegevens blijven bewaard) |
| `npm run logs` | Meekijken met de API-logs |
| `npm run reset-db` | Database wissen en opnieuw vullen met de demodata |
| `npm run verify` | Alle controles van CI in één keer: lint, types en tests met dekking |
| `npm test` | Alle tests van de API, de website en de app |

## Problemen oplossen

| Probleem | Oplossing |
| --- | --- |
| `Docker draait niet` | Open Docker Desktop, wacht tot *Engine running* en probeer opnieuw. |
| `port is already allocated` | Een ander programma gebruikt poort 3307. Kopieer `.env.example` naar `.env` en kies een andere poort (`DB_PORT`). |
| `De website (Vite) is gestopt` | Poort 8090 is bezet, bijvoorbeeld door een tweede `npm start` of `npm run dev`. Sluit dat venster en probeer opnieuw. |
| App: "Geen verbinding met de server" | Telefoon op hetzelfde wifi? Sta in de Windows Firewall poort **4000** (API) en **8081** (Expo) toe voor privénetwerken. Onderaan het inlogscherm van de app staat welk adres hij probeert. |
| QR-code opent de app niet | Staat Expo Go op je telefoon? Werkt het netwerk niet goed, probeer dan `cd mobile` en `npx expo start --tunnel`. |
| "Buiten zone" bij inklokken | Zet de werkzone op jouw locatie (stap 7). |
| Vreemde gegevens of fouten na veel testen | `npm run reset-db` zet de demodata terug (wist alle wijzigingen). |
| De app laat oude code zien | Stop Expo (`Ctrl+C`) en start opnieuw met `npm start`. Schud je telefoon en kies *Reload*. |

---

## Meer informatie

### Structuur

| Map | Inhoud |
| --- | --- |
| `frontend/` | Website: React + Vite + TypeScript |
| `backend/` | API: Node + Express + TypeScript (`/api/...`) |
| `mobile/` | App: Expo (React Native) met Expo Router |
| `db/init/` | MySQL-schema en demodata; draait bij de eerste start van de database |
| `scripts/` | `setup.mjs` en `start.mjs` (achter `npm run setup` en `npm start`) |
| `docker-compose.yml` | De services `db` (MySQL), `api` en `web` (nginx met de gebouwde website, alleen met `--profile prod`) |

### Adressen en poorten

| Service | Adres |
| --- | --- |
| Website | http://localhost:8090 |
| API | http://localhost:4000/api/health |
| MySQL | `localhost:3307`, database `clockit`, gebruiker `clockit` / `clockit` |
| Expo (app-server) | poort 8081 (andere poort: `$env:KLOKIT_EXPO_PORT=8082; npm start`) |

Instellingen (poorten, wachtwoorden, `JWT_SECRET`) staan in `.env.example`. Kopieer dat bestand naar `.env` om ze aan te passen. Gebruik in productie een eigen `JWT_SECRET` en `COOKIE_SECURE=true` (achter HTTPS).

### Werkzone en klokregels

De eigenaar stelt in waar en hoe er ingeklokt mag worden. Dat kan op twee plekken:

- **Website › Instellingen** (`/instellingen`): naam en adres (met zoeken), de werkzone op een kaart (pin slepen of op de kaart klikken, straal 25–300 m) en de klokregels.
- **App › Meer**: het restaurant met een voorbeeld van de werkzone. *Werkzone aanpassen* opent de kaart (Apple Maps op iPhone). De klokregels staan eronder en worden direct opgeslagen.

Een nieuwe eigenaar komt na het registreren meteen bij "Waar staat je restaurant?" (stap 2 van 3). Zolang er geen werkzone is, waarschuwen het dashboard en het overzicht in de app.

| Klokregel | Wat het doet |
| --- | --- |
| Nep-locaties blokkeren | Weigert inklokken als het toestel een nep-locatie meldt (Android). |
| Zwakke GPS markeren | Markeert inklokken met een slechtere nauwkeurigheid dan 20/30/50/75 m op het dashboard. |
| Automatisch uitklokken | Stopt een open dienst om middernacht en zet een correctie klaar voor de eigenaar. |

Adressen zoeken gaat via OpenStreetMap (Nominatim): gratis en zonder sleutel, maar bedoeld voor licht gebruik (max. 1 zoekopdracht per seconde).

### Inklokken

1. Stel eerst de werkzone in, bij voorkeur terwijl je in het restaurant staat.
2. Onder **Meer › QR-code voor de werkvloer** in de app staat de QR-code om op te hangen. Scannen met de iPhone-camera opent de app in het inklokscherm.
3. Medewerkers (en de eigenaar via Overzicht) tikken op *Inklokken*. De server controleert de afstand en de GPS-nauwkeurigheid en gebruikt de servertijd, niet de tijd van de telefoon.

Het adres zoeken kan direct bij de kaart: typ een adres in de zoekbalk op de kaart (website) of boven de kaart (app) en kies het uit de lijst. De pin springt ernaartoe.

### Urenoverzicht

**Website › Urenoverzicht** en **App › Uren** (eigenaar en manager):

- Per medewerker de uren per dag (week), per week (maand) of per dienst (dag), met het teamtotaal. Blader met ‹ › door de periodes.
- **Geel** = dienst loopt nog, **rood met \*** = er staat een correctie open. Klik of tik op een tijd voor de details (in- en uitkloktijd, afstand, GPS, status).
- *Top deze week* en *Gemarkeerde punches* (zwakke GPS of nep-GPS, volgens de klokregels).
- **Exporteren naar CSV** (website): één regel per dienst, opent direct goed in Excel. **Afdrukken** print alleen het overzicht.

### Correcties

Een correctie is een verzoek om de tijden van een dienst aan te passen.

- **Medewerkers** vragen een correctie aan in de app: tik in het inklokscherm op een dienst (*uitklokken vergeten* of *tijd klopt niet*) of op *Inklokken vergeten? Dienst toevoegen*. Onder *Mijn aanvragen* zien ze de uitkomst.
- **Klokit** maakt zelf een correctie aan als iemand na middernacht nog ingeklokt stond (klokregel *Automatisch uitklokken*).
- **Eigenaar en manager** beoordelen ze bij **Website › Correcties** of **App › Correcties**: je ziet de geregistreerde tijd naast de aangevraagde tijd, de toelichting en de geschiedenis.
  - *Goedkeuren* past de dienst aan (of voegt hem toe bij inklokken vergeten).
  - *Tijd aanpassen* laat je zelf de juiste tijden invullen en daarna goedkeuren.
  - *Afwijzen* laat de dienst zoals hij was. Een opmerking is optioneel.

### Ontwikkelen met snel herladen

`npm start` draait de website al met directe updates in de browser (http://localhost:8090). Alleen de website, zonder de app:

```powershell
docker compose up -d db api
cd frontend
npm run dev          # http://localhost:8090, /api gaat naar poort 4000
```

De API lokaal draaien kan ook (stop dan eerst de `api`-container met `docker compose stop api`):

```powershell
cd backend
$env:DB_PORT=3307; npm run dev
```

Na wijzigingen aan de API: `docker compose up -d --build api` bouwt de container opnieuw.

De gebouwde website (nginx, zoals in productie) testen: stop eerst `npm start` en draai `docker compose --profile prod up -d --build web`.

### De app los starten

```powershell
docker compose up -d
cd mobile
npx expo start
```

- De app zoekt de API automatisch op het netwerkadres van je computer, poort 4000.
- Een vast adres instellen kan in `mobile/.env.local`: `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api`.
- In de browser testen kan ook: `npx expo start --web` (zonder kaart; die werkt alleen op de telefoon).

### Testen en de pijplijn

Elke pull request draait automatisch dezelfde controles die jij lokaal kunt draaien. Alles in één keer, vanuit de hoofdmap:

```bash
npm run verify
```

Of per onderdeel (`backend/`, `frontend/` of `mobile/`):

| Commando | Wat het doet |
| --- | --- |
| `npm run lint` | Stijl- en kwaliteitscontrole (Biome in de API en de website, ESLint in de app) |
| `npm run typecheck` | TypeScript controleert de types zonder te bouwen |
| `npm test` | De tests |
| `npm run test:coverage` | De tests plus een dekkingsrapport; faalt onder **80%** |

De API heeft daarnaast integratietests die met een echte MySQL praten:

```bash
cd backend
npm run test:integration
```

#### Wat er in GitHub draait

| Workflow | Wanneer | Wat |
| --- | --- | --- |
| `ci.yml` | elke pull request en push naar `main`/`Development` | lint, types, tests met dekking, integratietests tegen MySQL, en de Docker-images bouwen |
| `release.yml` | merge naar `main` of een tag `v1.2.3` | publiceert de images van de API en de website naar ghcr.io |
| `mobile-release.yml` | handmatig of bij een tag `v1.2.3` | bouwt de app via EAS Build in de cloud |

De dekking gaat per onderdeel naar [Codecov](https://app.codecov.io). Daarvoor zijn twee geheimen nodig onder **Settings › Secrets and variables › Actions**: `CODECOV_TOKEN` en, voor de app-builds, `EXPO_TOKEN`.

Wil je meewerken? Lees [CONTRIBUTING.md](CONTRIBUTING.md). Het werk dat nog openstaat staat in Linear: https://linear.app/clock-it

## Licentie

Copyright (c) 2026 Serhat Yildirim en Eyobiel. **Alle rechten voorbehouden.** De code mag niet zonder schriftelijke toestemming worden gebruikt, gekopieerd of verspreid. Zie [LICENSE](LICENSE).

# Backlog

Het werk staat in Linear, in het team **Clock it** met voorvoegsel `CLO`:
https://linear.app/clock-it

Dit bestand heeft hier even een lijst met tickets gestaan, voordat Linear was gekoppeld. Die lijst staat er niet meer in: twee backlogs naast elkaar lopen binnen een week uit elkaar, en dan weet niemand meer welke de echte is. Linear is de echte.

## Waar te beginnen

De tickets zijn geordend op prioriteit. Deze drie blokkeren de rest en kosten samen niet veel tijd:

| Ticket | Waarom eerst |
| --- | --- |
| [CLO-19](https://linear.app/clock-it/issue/CLO-19) | Zonder branch protection is de hele pijplijn vrijblijvend |
| [CLO-6](https://linear.app/clock-it/issue/CLO-6) | `JWT_SECRET` heeft een standaardwaarde, dus tokens zijn te vervalsen |
| [CLO-7](https://linear.app/clock-it/issue/CLO-7) | Wie ontslagen is, houdt 30 dagen toegang |

## Verwijzingen uit de code

Op een paar plekken staat een lintregel op *waarschuwing* in plaats van uitgezet, met een ticket erbij waar het opgelost wordt:

| Plek | Ticket |
| --- | --- |
| `frontend/biome.json` (toegankelijkheid) | [CLO-23](https://linear.app/clock-it/issue/CLO-23) |
| `frontend/biome.json` (`useExhaustiveDependencies`, `noArrayIndexKey`) | [CLO-23](https://linear.app/clock-it/issue/CLO-23) |
| `mobile/eslint.config.js` (React Compiler) | [CLO-24](https://linear.app/clock-it/issue/CLO-24) |
| `backend/vitest.config.ts`, `frontend/vitest.config.ts`, `mobile/jest.config.js` (lijst met gedekte bestanden) | [CLO-22](https://linear.app/clock-it/issue/CLO-22) |

Zet je zo'n regel terug op `error`, haal dan ook de verwijzing hier weg.

## Nieuw ticket maken

Gebruik de sjablonen in GitHub voor meldingen van buiten het team (`.github/ISSUE_TEMPLATE/`), en Linear voor het werk zelf. Zet `CLO-12` in de titel van je pull request, dan koppelt Linear het automatisch en sluit het ticket bij de merge. Zie [CONTRIBUTING.md](../CONTRIBUTING.md).

# Proposal

## Why

Kampstøtte må være trygg å bruke på sidelinjen selv uten stabil mobildekning, og trenere må kunne stole på at kampdata ikke går tapt. Grunnleggende offline- og synkfunksjoner er kodet, men trenger integrasjonstesting før deling mellom enheter og mer funksjonalitet innføres.

## What Changes

Dette er et **planforslag**, ikke en bestilling om å implementere alle punktene nå. Kravene beskriver ønsket fremtidig atferd; ingen nye funksjoner regnes som ferdige fordi planen valideres.

Prioritert rekkefølge:

1. **P0 – Pålitelig kampbruk:** verifiser flymodus, gjenåpning, tilkobling, samlet lagring og feiltilstander. Rett eksisterende lint-feil og vurder sikkerhetsvarsler før neste publisering.
2. **P1 – Sikret tilgang:** etabler treneridentitet og avgrenset tilgang før laglisten deles. Eksisterende data skal ikke automatisk bli tilgjengelig for alle innloggede brukere.
3. **P1 – Delte lag og trygg redigering:** del lagliste mellom autoriserte trenere, behold eksisterende lag-ID-er og oppdag samtidige endringer i stedet for stille overskriving.
4. **P2 – Sikkerhetskopi:** eksport og kontrollert gjenoppretting av tropp, oppsett, klokke, spilletid og logg.
5. **P2 – Mobilbruk og tilgjengelighet:** verifiser trykk, dra, tastatur, synlig spilletid og tydelige bekreftelser på små skjermer.

## Capabilities

### New Capabilities

Det finnes ingen eksisterende OpenSpec-spesifikasjoner. Nye spesifikasjoner dekker derfor også krav til videre verifikasjon av funksjoner som allerede er kodet.

- `reliable-match-sync`: offline-bruk, korrekt synkstatus, samlet lagring, lagringsfeil og gjenopptakelse.
- `team-access`: identitet, lesetilgang og redigeringstilgang til lagdata.
- `shared-team-management`: delt lagliste, trygg fjerning og vern mot konkurrerende endringer.
- `match-backup`: eksport, validering og kontrollert gjenoppretting.
- `mobile-matchday`: bevarte bytteinteraksjoner og tilgjengelig mobilgrensesnitt.

### Modified Capabilities

Ingen; OpenSpec er nylig initialisert og har ingen hovedspesifikasjoner.

## Impact

- Berørte områder ved senere implementering: `src/firebase.js`, `src/syncQueue.js`, `src/storage.js`, `src/teams.js`, `src/App.jsx` og kampdagskomponentene.
- Tilgang og delt lagliste krever Firebase Authentication, testede sikkerhetsregler og kontrollert migrering. Nye tjenester/avhengigheter godkjennes før innføring.
- Testarbeid: eksisterende Node-tester, Firebase Emulator og nettlesertester, samt Safari/iPhone og Chrome/Android.
- Publisering må bevare PWA-basebane og ikke tvinge oppdatering midt i kamp. Eksisterende `ready-lilla` og `ready-gronn` skal beholde ID og data.
- Dette forslaget endrer bare planleggingsfiler; ingen migrering eller produksjonsendring utføres nå.

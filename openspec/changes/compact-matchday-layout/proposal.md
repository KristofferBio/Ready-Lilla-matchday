# Proposal

## Why

Treneren må i dag rulle for å se bane og benk samtidig. Kampdag skal være en stabil arbeidsflate tilpasset skjermhøyden, ikke et dokument som flytter seg under bytter.

## What Changes

- Lagvalg, lagadministrasjon og formasjonsvalg vises bare i Tropp.
- Klokke, navigasjon og synkstatus får kompakt, fast plass i toppen.
- Bane tilpasses gjenværende skjermhøyde, med uendrede trykk-/drahandlinger.
- Benk får fire like store spillerknapper per rad og to faste synlige rader; flere enn åtte benkspillere nås gjennom intern rulling.
- Byttelogg og bekreftede nullstillingshandlinger åpnes over kampflaten uten å skyve banen.
- Synlig bytteforklaring fjernes; valgt spiller markeres fortsatt rosa og varsles til hjelpemidler.

## Capabilities

### New Capabilities
- `compact-matchday-layout`: fast, skjermtilpasset kampflate med kompakt benk og overliggende paneler.

### Modified Capabilities
Ingen hovedspesifikasjoner finnes ennå. Kravene supplerer den ikke-arkiverte forbedringsplanen.

## Impact

`src/App.jsx`, `FormationView`, `MatchClock`, `SyncStatus`, `SubLog`, CSS og emulatortester. Ingen endring i Firebase-skriveformat, kø, lag-ID-er, klokkegrenser eller spilletidsberegning. Brukeren har godkjent denne visuelle endringen; publisering er ikke del av oppgaven.

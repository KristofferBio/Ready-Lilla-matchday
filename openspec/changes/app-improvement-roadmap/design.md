# Design

## Context

Se `proposal.md` for begrunnelse og prioritering. Appen bruker én Firestore-post per lag og en separat klokke-post. Laglisten er lokal. `src/syncQueue.js` beholder usendte felt i localStorage; Firestore har vedvarende cache. Bytter lagres samlet, men konkurrerende enheter bruker fortsatt sist lagrede verdi. Det er 13 beståtte Node-tester fra siste gjennomgang, mens full lint har eksisterende feil og mobil-/Firebase-integrasjonstesting gjenstår.

Dette dokumentet beskriver et foreslått mål. P0 er senere godkjent og den automatiserte delen er gjennomført; se `tasks.md` og `docs/testing.md`. Ingen migrering av produksjonstilgang eller delt lagregister er utført. Utførelse av videre faser krever brukerens klarsignal.

## Goals / Non-Goals

**Goals:**
- Behold eksisterende lag-ID-er, lokale data, PWA-basebane og bytteinteraksjoner.
- La testbare milepæler avgjøre når neste fase kan startes.
- Avgrens nye arkitekturvalg til områder der dagens modell ikke oppfyller spesifikasjonene.

**Non-Goals:**
- Ingen automatisk sletting, publisering eller endring av produksjonsregler i planarbeidet.
- Ingen full kampturneringsplattform, spillerinnlogging, statistikkportal eller automatisk konfliktfletting.
- Ingen utvidelse av deling før identitet, rettigheter og migrering er godkjent og testet.

## Decisions

### 1. Verifikasjon før utvidelse

P0 begynner med Firebase Emulator og produksjonsbygd PWA i nettlesertester, supplert med fysisk iPhone/Android. Node-tester alene kan ikke bevise service worker-atferd, nettbrudd eller Firestore-tilgang. Alternativet, å bygge deling først, gjør feil vanskeligere å isolere. Testresultater logges med miljø og tydelig «ikke testet» der utstyr mangler.

### 2. Ett varig lokalt kampbilde og eksplisitte feil

Vurder å samle kampbildet i en versjonert lokal post fremfor flere uavhengige localStorage-nøkler. Kø og kampbilde må kunne gjenopprettes konsistent ved avbrudd; ikke anta at to separate lagringsoperasjoner er atomiske. Behold migrerende lesing av gamle nøkler. Alternativet er å fortsette med separate nøkler, men det krever dokumentert gjenoppretting og tilsvarende feiltester. Velg løsning etter P0-feiltestene, før lokal lagringskode endres.

P0-beslutning etter testing: kampbilde og ventende patch er samlet i én localStorage-post. Bekreftelse merker posten som ikke-ventende og beholder kampbildet. Gamle nøkler og eldre køformat beholdes som lesbar fallback; ingen sletteoperasjon inngår i migreringen. Feil ved lagring stopper redigering eller beholder kø til retry. Tester dekker gammel kø, baseline fra lokale felt, gjenåpning og full nettleseromstart. Kamp og klokke er fortsatt separate poster; endringen er ikke en flerposttransaksjon eller konfliktkontroll mellom enheter.

### 3. Tilgang før delt register

Foreslått retning er Firebase Authentication og serverhåndhevet medlemskap med administrator-, redaktør- og leserroller. Før implementering godkjennes innloggingsmåte og hvem som administrerer medlemmer; brukere kan ikke selv skrive seg inn som medlem. Autoriseringsregler dekker både lagliste, kamp og klokke. Alternativet med deling bare via kjent lag-ID eller skjult knapp beskytter ikke persondata.

Eksisterende data knyttes eksplisitt til en godkjent trenergruppe; ingen automatisk «første innloggede eier». Ved kontobytte isoleres lokal cache/kø per identitet, og ventende endringer varsles før bytte. Dette er spesielt viktig siden Firestore-cache og localStorage ellers deles av samme nettleser.

### 4. Stabilt lagregister og arkivering

Et skyregister med stabile ID-er og navn/farge/arkiveringsstatus erstatter den lokale listen for innloggede trenere. Eksisterende ID-er beholdes; nøyaktig registerbane fastsettes sammen med tilgangsreglene. En sletting fra den delte listen betyr arkivering, ikke fysisk sletting av kampdata. Alternativet med hard sletting gir unødvendig risiko, særlig ved offline-enheter.

### 5. Konfliktkontroll krever bekreftet revisjon

Foreslått retning er en revisjonert kamp-post, inkludert koordinert klokkestatus for fremtidige endringer. Lokal kø beholder basisrevisjon, endrings-ID og endringsinnhold. Ved tilkobling brukes en online Firestore-transaksjon eller tilsvarende betrodd atomisk kontroll som avviser feil basisrevisjon. Transaksjoner kan ikke kjøres offline; køen forblir derfor lokal inntil tilkobling.

Ikke bruk ubetinget `setDoc` som transport for den revisjonskontrollerte køen: automatisk Firestore-replay må ikke omgå konfliktkontrollen. Ved konflikt beholdes begge kampbilder for eksplisitt valg eller nytt forsøk fra oppdatert versjon. Alternativene «sist lagrede verdi vinner» og automatisk fletting av spilletidskart kan gi feil logg/tider og tilfredsstiller ikke konfliktkravet.

### 6. Versjonert eksport før gjenoppretting

JSON-eksport får formatversjon, tidspunkt, lagidentitet, komplett lokalt kampbilde og synkstatus. Import valideres før forhåndsvisning/bekreftelse, sikkerhetskopierer gammelt bilde og går gjennom tilgangs- og revisjonskontroll. Eksportfilen inneholder ikke innloggingstokener eller adgangsgivende medlemskap. Alternativet CSV alene egner seg ikke for tapsfri gjenoppretting av oppsett og klokke.

## Risks / Trade-offs

- [Nettleseren sletter lokal lagring] → Eksport, tydelig status og instruks om ikke å slette data før synk; ingen løfte om absolutt offline-varighet.
- [Flere faner sender samme kø] → Test faner, duplikate endrings-ID-er og sen bekreftelse; idempotent mottak og revisjonskontroll i målarkitekturen.
- [Ny sikkerhetsregel låser ute gamle klienter] → Godkjent migrering, test i emulator, kontrollert utrulling og særskilt plan for ventende gamle skriver.
- [Spillernavn i eksport/cache] → Ingen nye personopplysninger, tilgangsavgrensing og dokumentert håndtering av filer og delte enheter.
- [Stor samlet endring] → Planen er en paraply; gjennomfør én fase av gangen og splitt store faser i egne OpenSpec-endringer før koding.
- [Gamle appversjoner omgår revisjonskontroll] → Produksjonsregler må håndheve den nye kontrakten; en UI-endring alene er ikke tilstrekkelig.

## Migration Plan

1. Godkjenn første fase og etabler isolert testmiljø; ikke migrer produksjon nå.
2. Dokumenter fungerende P0-scenarier og rett feil før deling bygges.
3. Godkjenn innlogging/medlemsadministrasjon og migreringskart for eksisterende lag; ta sikkerhetskopi av skydata og lokale køer før senere utrulling.
4. Test migrering på kopierte testdata, inkludert begge standardlag, tom lagliste, nye lokale lag og ventende offline-endringer.
5. Innfør nye revisjons-/tilgangskrav med planlagt håndtering av gamle klienter. Appoppdatering skjer uten tvungen omlasting midt i kamp.
6. Verifiser med minst to autoriserte testklienter før produksjonsgodkjenning.
7. Ved feil stopp nye migreringer og behold køer/backup; ikke rull tilbake til ubetingede gamle skriver dersom revisjonskontroll er tatt i bruk. Gjenoppretting må være kompatibel med aktivt dataformat og sikkerhetsregler.

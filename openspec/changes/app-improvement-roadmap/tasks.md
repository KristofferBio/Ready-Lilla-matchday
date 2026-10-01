# Tasks

P0 er påbegynt og den automatiserte delen er gjennomført etter brukerens godkjenning av punkt 1. Resultater og begrensninger står i `docs/testing.md`: grønn lint/bygg, 17 Node-tester og 11 Chromium-/emulatortester. Videre faser trenger eget klarsignal. Mobiltest krever fysisk utstyr og kan ikke markeres ferdig utelukkende med nettleseremulering.

## 1. P0 – Testgrunnlag og kvalitet

- [x] 1.1 Avtal første arbeidsfase og avgrens et isolert testmiljø; verifiser med godkjent fasebeskrivelse og dokumentert sperre mot produksjonsskriving.
- [x] 1.2 Etabler Firebase Emulator og nettlesertester av produksjonsbygget under riktig basebane; verifiser med en test som leser/skriver kun testlag og aldri produksjon.
- [x] 1.3 Rett eksisterende React-hooks-/lint-feil uten å endre bytte- eller klokkeatferd; verifiser med `npm run lint`, `node --test tests/*.test.js` og regresjonstest av klokke/trykkbytter.
- [x] 1.4 Gjennomgå `npm audit`, skill produksjons- og utviklingsavhengigheter og foreslå målrettede oppdateringer; verifiser med dokumentert vurdering av alle høye/kritiske varsler og bygg/test etter hver godkjente oppdatering.
- [x] 1.5 Legg eksisterende tester, lint og bygg inn i CI og dokumenter lokal kjøring; verifiser med grønn testjobb og at README-kommandoene fungerer på en ren installasjon.

1.5 er verifisert: brukeren pushet commit `4ac8dda`, og [GitHub Actions-kjøring 36747091718](https://github.com/KristofferBio/Ready-Lilla-matchday/actions/runs/36747091718) fullførte med grønn kvalitetssjekk og Pages-publisering. `npm ci`, lint, Node-tester, bygg og emulatortester bestod i CI. Ren installasjon er også verifisert lokalt.

## 2. P0 – Offline og synkronisering før kampbruk

- [x] 2.1 Automatiser flymodus, bytte, lukking/gjenåpning og tilkobling i produksjonsbygget mot emulator; verifiser at oppsett, spilletid og logg beholdes og bekreftes på en annen testklient.
- [x] 2.2 Test forsinket første skyinnlasting, sen skrivebekreftelse, doble forsøk, flere faner og klokkeendringer; verifiser at ingen nyere lokal endring slettes og at testene gjentas uten ekstra byttelogglinjer.
- [x] 2.3 Test avvist skylagring, full/utilgjengelig lokal lagring og avbrudd mellom kølagring og lokal caching; verifiser forståelig feilstatus og gjenoppretting av konsistente data.
- [x] 2.4 Velg og dokumenter lokal lagringsstrategi ut fra feiltestene, og rett påviste hull; verifiser med tester av migrering fra gamle nøkler og gjenoppretting etter simulerte avbrudd.
- [x] 2.5 Test ny appversjon mens kampvinduet er åpent; verifiser at ingen tvungen omlasting skjer og at ventende data beholdes ved senere normal oppdatering.
- [ ] 2.6 Gjennomfør installasjon, flymodus/gjenåpning og tilkobling på Safari/iPhone og Chrome/Android; verifiser med testprotokoll som oppgir enhet, nettleser, versjon og faktiske resultater.
- [x] 2.7 Oppdater bruksveiledning og testprotokoll med begrensninger og feiltiltak; verifiser at en trener kan følge veiledningen og at utestede miljøer ikke fremstilles som godkjente.

2.6 er ikke testet: ingen fysisk iPhone/Android er brukt. Manuell sjekkliste og feiltiltak ligger i `docs/testing.md`. Nettverksemulering i Chrome og nettleseromstart er ikke en erstatning for denne kontrollen. Samtidig konkurrerende redigering fra ulike enheter forblir fase 4.

## 3. P1 – Identitet og tilgang før deling

- [ ] 3.1 Lag et avgrenset oppfølgingsforslag for innlogging, medlemsadministrasjon og migreringskart; verifiser eksplisitt godkjenning før Authentication, tilgangsregler eller nye tjenester innføres.
- [ ] 3.2 Innfør godkjent innlogging og identitetsavgrenset lokal cache/kø; verifiser innlogging, utlogging og kontobytte med ventende endringer uten datalekkasje eller sending som feil bruker.
- [ ] 3.3 Innfør medlemskap og roller samt regler for lagregister, kamp og klokke; verifiser emulator-tester for administrator/redaktør/leser, ukjent bruker og direkte forsøk på egenoppgradering.
- [ ] 3.4 Test kontrollert tilknytning av eksisterende lag og håndtering av gamle klienter; verifiser at kjent ID eller likt lagnavn ikke gir tilgang og at ingen gamle lagdata endres uten godkjenning.
- [ ] 3.5 Dokumenter medlemsadministrasjon, delte enheter og tilbakekalling av tilgang; verifiser med gjennomgang av godkjent administrator og test av en tilbakekalt brukers neste skyforespørsel.

## 4. P1 – Delt lagliste og konfliktsikker kamp

- [ ] 4.1 Lag et avgrenset oppfølgingsforslag med registerstruktur, revisjonskontrakt og kompatibilitetsplan; verifiser at alle eksisterende lag-ID-er og ventende gamle skriver er dekket før migreringskode bygges.
- [ ] 4.2 Innfør delt lagregister med offline-visning og kontrollert import av lokale lag; verifiser samme ID/navn/farge på to autoriserte klienter, inkludert tom liste og standardlagene.
- [ ] 4.3 Innfør bekreftet arkivering og administratorstyrt gjenoppretting; verifiser avbrutt handling, blokkering ved lokal ventekø og bevart tropp/kampdata etter gjenoppretting.
- [ ] 4.4 Innfør revisjonskontroll og idempotente endrings-ID-er i kamp-/klokkelagring; verifiser at duplikate forsøk ikke dupliserer logg og at gamle direkte skriver avvises av tjenesten.
- [ ] 4.5 Innfør konfliktvisning som beholder lokalt og delt kampbilde og krever eksplisitt avklaring; verifiser to samtidige bytter og offline-tilkobling etter at en annen enhet har redigert.
- [ ] 4.6 Dokumenter deling, arkivering og konfliktløsning; verifiser veiledningen med to testklienter og protokoll som viser hvem som kan se og endre hvert lag.

## 5. P2 – Sikkerhetskopi og gjenoppretting

- [ ] 5.1 Innfør versjonert JSON-eksport av komplett lokalt kampbilde med tidspunkt og synkstatus; verifiser eksport uten nett og at filen ikke inneholder innloggingstokener eller tilgangsgivende data.
- [ ] 5.2 Innfør importvalidering og forhåndsvisning med bekreftelse; verifiser ugyldig format, ukjent versjon, brutte spillerreferanser og Avbryt uten endring av eksisterende data.
- [ ] 5.3 Innfør backup av tidligere kampbilde og gjenoppretting gjennom tilgangs-/revisjonskontroll; verifiser eksport–import-rundtur og avvist overskriving av et lag uten redigeringstilgang.
- [ ] 5.4 Dokumenter eksport, oppbevaring og gjenoppretting; verifiser at veiledningen forklarer ventende synk og at en fil ikke gir rettigheter til et annet lag.

## 6. P2 – Mobilbruk og tilgjengelighet

- [ ] 6.1 Test begge trykkretninger, rosa valg, avbryt med samme spiller og dra uten ekstraklikk; verifiser ett korrekt bytte med samlet logg-/spilletidsendring i hvert scenario.
- [ ] 6.2 Test alle formasjoner ved 320/375 CSS-piksler og større tekst; rett avkutting og utilsiktet horisontal rulling, og verifiser spesielt sentral spiss og spilletidsmerke.
- [ ] 6.3 Rett fokus, tilgjengelige navn og tastaturflyt der testene avdekker mangler; verifiser bytte uten mus og at synk-/feilstatus er forståelig uten farge.
- [ ] 6.4 Verifiser resetbekreftelser og fravær av separat byttelogg-reset; dokumenter interaksjonene og verifiser at Avbryt lar spilletid/logg forbli uendret.

## 7. Integrasjon og publiseringsbeslutning

- [ ] 7.1 Kjør samlet kampøvelse på to autoriserte enheter med offline-bytteløp, konflikter, arkivering og backup; verifiser mot alle fem spesifikasjoner og dokumenter eventuelle blokkere.
- [ ] 7.2 Lag publiserings- og gjenopprettingsbeslutning med migreringsbackup og håndtering av gamle klienter; verifiser brukerens godkjenning før endringer publiseres og ingen tvungen oppdatering under kamp.

# P0 – Testoppsett og protokoll

## Avgrensning

Brukeren godkjente punkt 1 i forbedringsplanen: test offline/synk og rett kvalitetsfeil. Arbeidet dekker OpenSpec-gruppe 1 og den automatiserbare delen av gruppe 2. Brukeren pushet senere commit `4ac8dda`, som utløste vellykket Pages-publisering. Innlogging, delte lag og produksjonsregler er ikke endret.

## Sikkerhetssperrer

- `npm run test:e2e` bygger med modusen `e2e` til **dist-e2e**, aldri til produksjonens **dist**.
- Testbygget har kun Firebase-prosjektet **demo-kampstotte**, bruker emulatoren på **127.0.0.1:8085** og nekter oppstart fra et annet vertsnavn enn localhost/127.0.0.1.
- Emulatoren startes eksplisitt med `firebase.e2e.json` og `--project demo-kampstotte`. Ingen produksjonskonto eller Firebase-innlogging er nødvendig.
- Emulatorreglene tillater bare lag-ID-er som starter med `test-`. `test-denied-*` brukes til å verifisere avvist lagring. Regelfilen er **kun for tester** og skal aldri deployes.
- REST-hjelperen har hardkodet demo-/loopback-adresse og validerer ID-er før seeding. `Bearer owner` er emulatorens lokale bypass, ikke en produksjonscredential.
- Playwright sperrer eksterne forespørsler; testbyggets CSP begrenser nettverk og bilder. Firebase kan forsøke en Google-probe ved nettbrudd, men den blokkeres. Testene kontrollerer at ingen eksterne svar mottas.
- Hver test lager egne fiktive spillere og unike testlag. Nettleseromstart bruker en ny, kort testprofil i midlertidig `opencode`-mappe, aldri trenerens nettleserprofil.

## Kjøring

Anbefalt: Node.js 24 og Java 21 tilgjengelig på PATH. Lokal kjøring på Node 25.9.0 har også bestått, men Firebase CLI-avhengigheten `superstatic` varsler at bare Node 20/22/24 støttes.

```sh
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

På Linux/CI brukes `npx playwright install --with-deps chromium`. Java kan settes via `JAVA_HOME` og `PATH`; det er ikke nødvendig å installere Java globalt. Ved denne gjennomgangen ble en portabel Temurin Java 21-runtime lastet ned fra Adoptium og SHA-256 kontrollert før bruk.

`test:e2e` starter og stopper emulatoren og sin egen preview-server på port 4185. Port 8085 og 4185 må være ledige. Testene bygger en installérbar PWA og tester service worker, ikke bare Vites utviklingsmodus. Rapporten ligger i `playwright-report/`; feilspor i `test-results/`.

## Lokal lagringsbeslutning

Kampbilde og ventende endring lagres nå i **samme localStorage-post**, med én `setItem` per redigering. Ved skybekreftelse beholdes kampbildet og posten merkes `pending: false`; den slettes ikke. Prefikset `kampstotte_pending_` er beholdt av hensyn til kompatibilitet, men en post med `pending: false` er bare lokal cache, ikke en ventende endring.

Gamle feltbaserte nøkler leses som fallback og tas inn som basis ved første redigering/cacheoppdatering. Gamle køposter uten `pending`/`snapshot` behandles fortsatt som ventende. Ingen gamle nøkler slettes i migreringen. Gamle klienter kan fortsatt lese sine gamle felt, men skriver ikke det nye komplette kampbildet; bruk ikke en gammel appversjon parallelt til å redigere samme kamp.

Ved full lagring stoppes redigeringen før UI-oppdatering og sending til skyen. Hvis skydata ikke kan caches, vises lokal lagringsfeil. Hvis lokal registrering av skybekreftelse feiler, beholdes køen til nytt forsøk. Skadet kø-JSON overskrives ikke stille. Lagringen er atomisk per post, **ikke** en transaksjon på tvers av kamp og separat klokke.

Denne rettingen løser ikke konkurrerende redigering fra flere enheter. Sist lagrede feltverdi vinner fortsatt; bruk én enhet til å styre kampen.

## Protokoll – 30. september 2026

Miljø: Windows, Node 25.9.0, Vite 8.3.1, Firebase SDK 12.12.1, Firebase CLI 15.32.0, Firestore Emulator 1.22.0, Playwright 1.63.0 / Chromium 153.0.8010.12, Java 21.

| Kontroll | Status / dokumentasjon |
| --- | --- |
| Lint og enhetstester | Grønn lint; 17 Node-tester, inkludert lagliste, kø, sen bekreftelse, bevarte snapshots og gammel køstruktur. |
| Ren installasjon | `npm ci`, lint, 17 Node-tester og produksjonsbygg bestått i en separat midlertidig prosjektkopi. |
| Trykkbytter og samlet skydata | Begge retninger, riktig spilletid og logg testet mot emulator. |
| Offline sidegjenåpning | PWA-cache, beholdt kø og bekreftelse på en ny klient testet. |
| Full nettleseromstart | Separat testprofil lukkes og gjenåpnes offline; ventende bytte beholdes og sendes etter tilkobling. |
| Klokke | Start, pause, avbrutt reset, automatisk 35-minutters pause, videreføring og 100-minutters reset testes. |
| Feiltilstander | Avvist skylagring, full lokal lagring og utilgjengelig snapshot-lagring testes med synlig status og uendrede skydata ved avvist redigering. |
| Forsinket innlasting | Lokalt bytte før første skyrespons beholdes. Sene skrivebekreftelser og gamle køposter dekkes også av Node-tester. |
| Flere faner | Bekreftet endring vises i begge faner uten duplisert logg; dette er ikke bevis på konfliktfri samtidig redigering. |
| Ny appversjon | Ny service worker blir ventende; åpent kampvindu lastes ikke om og ventekøen beholdes. |
| Fysisk Safari/iPhone og Chrome/Android | **Ikke testet**; krever manuell kontroll nedenfor. |
| GitHub Actions | **Bestått** for commit `4ac8dda`: ren installasjon, lint, Node-tester, bygg, Chromium-/emulatortester og Pages-publisering. [Kjøring 36747091718](https://github.com/KristofferBio/Ready-Lilla-matchday/actions/runs/36747091718). |
| Produksjonsregler og reelle kampdata | Ikke endret, ikke brukt til skrivetester. |

Endelig samlet kjøring: **11 av 11 E2E-tester bestått**, i tillegg til grønn lint, 17 Node-tester og produksjonsbygg. Status er også oppdatert i OpenSpec-fremdriften. PWA-bygget gir fortsatt en størrelse-advarsel for hoved-JavaScript (>500 kB); dette er ikke en byggfeil.

## Manuell mobilkontroll før kampbruk

### Visuell oppfølging – 1. oktober 2026

Kampdag er endret til fast kampflate. Lagvalg og formasjon ligger i Tropp; forklaringsteksten er fjernet. Benken har fire like knapper per rad og to faste synlige rader. Logg og resetbekreftelser åpnes som tilgjengelige overliggende paneler. Skjermtilpasset SVG bevarer sirkler og bruker samme koordinater til rendering og touchmål.

Lokalt består grønn lint, 17 Node-tester, produksjonsbygg og 20 Chromium-/emulatortester (11 tidligere P0-tester + 9 layouttester). Layout er målt ved 320 × 568, 375 × 667, 390 × 844 og 844 × 390 CSS-piksler: ingen rulling av kampflaten, like benkknapper og samme bane-/benkrektangler før/etter bytte og loggåpning. Alle formasjoner er kontrollert for avkuttede tidsmerker. Stor benk testes med intern rulling, touch-sveip og langt trykk før drag, uten ekstra byttelogglinje. Panelenes tittel, fokus, Lukk og Escape testes.

Dette er emulert Chromium-touch, ikke fysisk iPhone-/Android-testing. Endringen er lokal og ikke publisert i denne oppgaven; CI-kjøringen fra 30. september gjelder forrige commit, ikke denne visuelle endringen. Lokal forhåndsvisning: `http://localhost:5174/Ready-Lilla-matchday/`.

### Sjekkliste på faktisk mobil

Bruk et særskilt testlag etter godkjent publisering, ikke en pågående kamp.

1. Noter dato, telefonmodell, operativsystem, nettleser og appversjon.
2. Åpne med nett og vent på «Synkronisert med skyen». Legg appen til på hjemskjermen og åpne den derfra.
3. Noter oppsett/spilletid/logg. Slå på flymodus, gjør et bytte og start/pause klokken. Status skal vise ventende lokale endringer.
4. Lukk appen helt, åpne den igjen i flymodus og kontroller at oppsett, spilletid, logg og klokke er beholdt.
5. Slå av flymodus. Vent på «Synkronisert med skyen» og kontroller de samme dataene på en annen klient med samme testlag-ID. Laglisten er fortsatt lokal, så den andre klientens lagtilknytning må avtales uten å endre produksjonslag.
6. Kontroller begge trykkretninger, rosa valg, avbryt, og dra uten ekstra bytte. Kontroller at sentral spiss og spilletidsmerke er synlige.
7. Gjenta på Safari/iPhone og Chrome/Android. Registrer hvert steg som bestått/feilet og ikke kryss av OpenSpec 2.6 før begge faktiske enheter er verifisert.

## Ved feil på sidelinjen

- **Uten nett / venter på skyen:** ikke slett nettleserdata, bytt profil eller gjeninstaller. Behold enheten og koble til nett; vent på bekreftelse.
- **Synkronisering feilet:** køen beholdes. Bruk «Prøv igjen» med nett. Hvis feilen vedvarer, må Firebase-tilgangen undersøkes; gjentatte trykk løser ikke manglende rettigheter.
- **Kunne ikke lagre endringen:** redigeringen er ikke utført. Sjekk lagringsplass/nettleserinnstillinger og prøv igjen. Ikke frigjør plass ved å slette appens ventende data.
- **Skadet lagring:** ikke overskriv/slett rådata før de er sikret. Automatisk full backup/import er en senere fase og finnes ikke ennå.

# Ready Lilla – Kampstøtte

React-app for tropp, formasjoner, kampklokke, spilletid og bytter for Ready Lilla og Ready Grønn.

## Utvikling

```sh
npm install
npm run dev
```

Anbefalt utviklingsmiljø er Node.js 24. Testoppsett, resultater og mobilkontroll er beskrevet i [docs/testing.md](docs/testing.md). Java 21 og Playwright Chromium kreves for emulatortestene.

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Emulatortestene bruker bare `demo-kampstotte` lokalt, bygger til `dist-e2e` og endrer ikke produksjonsdata. GitHub Actions kjører kvalitetssjekkene før Pages-publisering. Se [avhengighetskontrollen](docs/dependency-audit.md) for sikkerhetsvarsler og oppdateringer.

## Videre forbedringsplan (OpenSpec)

Planforslaget ligger i [`openspec/changes/app-improvement-roadmap/proposal.md`](openspec/changes/app-improvement-roadmap/proposal.md), med prioriterte oppgaver i [`tasks.md`](openspec/changes/app-improvement-roadmap/tasks.md), teknisk retning i `design.md` og testbare krav i `specs/`.

Rekkefølge: verifiser offline/synk og kvalitet først, deretter sikret tilgang og delte lag/konfliktkontroll, så sikkerhetskopi og mobiltilgjengelighet. Dette er en plan, ikke ferdig implementering. Hver fase godkjennes før gjennomføring.

Se status med `openspec status --change app-improvement-roadmap` og valider planen med `openspec validate app-improvement-roadmap --strict`.

## Lagadministrasjon

Lagvalg, lagadministrasjon og formasjonsvalg ligger i **Tropp**. **Kampdag** viser en fast, skjermtilpasset bane og benk med fire like store spillerknapper per rad. Benken reserverer to rader; ved flere enn åtte benkspillere ruller bare benken. På mobil kan du sveipe for å rulle en stor benk og holde inne kort før du drar en spiller. Vanlige trykkbytter fungerer som før.

Bytteloggen åpnes med «Byttelogg» i et panel over kampflaten. «Nullstill…» åpner nullstillingshandlingene med bekreftelse. Ingen av panelene skyver bane eller benk. På lave, brede skjermer vises benken ved siden av banen.

Bruk «Administrer lag» for å legge til lag med navn og farge, eller fjerne lag fra listen med bekreftelse. Ready Lilla og Ready Grønn brukes bare som startlag når ingen lagliste er lagret. En tom lagliste beholdes også etter omlasting.

Laglisten lagres lokalt per nettleser/enhet og synkroniseres foreløpig ikke. Fjerning sletter ikke lokale kampdata eller dokumenter i Firebase. Et nytt lag får en unik ID og starter med tom tropp; å opprette samme navn igjen gjenoppretter ikke det fjernede laget.

## Installerbar app og bruk uten nett

Produksjonsbygget har et PWA-manifest og en service worker som lagrer appens filer på enheten. Firebase-trafikk mellomlagres ikke av service workeren.

1. Åpne appen med nett og la første innlasting fullføre.
2. På iPhone: bruk Safari → Del → Legg til på Hjem-skjerm. På Android: bruk nettleserens installeringsvalg eller «Legg til på startskjermen».
3. Appen kan deretter åpnes uten nett, så lenge nettleseren ikke har slettet lagringen. Installasjon er valgfritt for offline-bruk.

Kampdata lagres lokalt og endringer legges i en varig kø for skysynkronisering. Nettleserlagring er ikke en sikkerhetskopi.

## Skysynkronisering

- Firebase bruker vedvarende IndexedDB-hurtigbuffer. I tillegg lagrer appen en kø i localStorage til skyen bekrefter lagringen. Køen gjenopptas ved gjenåpning og når nettet kommer tilbake.
- Kampbilde og ventende endring lagres sammen. Ved bekreftelse beholdes kampbildet lokalt; gamle lagringsnøkler leses fortsatt som fallback uten sletting.
- Synkstatus under lagknappene viser om data er bekreftet av skyen, venter på lagring, eller om appen er uten nett. Ved lagringsfeil beholdes køen og «Prøv igjen» kan brukes. Firebase-tilgangsregler må tillate lesing/skriving for appen.
- Oppsett, spilletid og byttelogg lagres samlet ved innbytter. Kartfelter erstattes helt, slik at slettede posisjoner/spilletider også fjernes i skyen.
- Lagdata og klokke abonneres på i sanntid. Forsinkede skydata brukes ikke mens lokale endringer venter, eller hvis det er gjort nye lokale endringer før en mottatt oppdatering brukes.
- Samtidig redigering fra flere enheter er ikke konfliktfri: sist lagrede verdi for samme felt vinner. Bruk én enhet til å styre kampen. Laglisten synkroniseres fortsatt ikke.
- Offline-bruk krever at nettleserens lagring er tilgjengelig og ikke slettes. Ikke slett nettleserdata eller bytt nettleser før ventende endringer er synkronisert.
- Ved lokal lagringsfeil får du et tydelig varsel; en redigering som ikke kan lagres, utføres ikke. Sjekk lagringsplass/innstillinger og prøv igjen uten å slette ventende data.

### Kontroll av synkronisering

Bruk et eget testlag, ikke en pågående kamp. Vent på «Synkronisert med skyen», gå i flymodus og gjør et bytte. Lukk og gjenåpne appen uten nett; oppsett, spilletid og logg skal være beholdt. Slå på nett og vent på bekreftet synkstatus. Sjekk samme lag-ID på en annen klient etterpå (laglisten er lokal). Test også at forsinket første skyinnlasting ikke endrer et oppsett du nettopp har redigert. Full mobil-/Firebase-test må utføres før kampbruk.

Automatiske tester av kø og lagliste: `node --test tests/*.test.js`.

Oppdateringer aktiveres når alle vinduer med appen er lukket, ikke ved tvungen omlasting midt i en kamp. Første innlasting og installasjon krever nett. HTTPS kreves ved publisering (localhost er tillatt ved lokal testing).

## Test produksjonsbygget uten nett

Service workeren er bevisst deaktivert i utviklingsmodus. Test med:

```sh
npm run build
npm run preview -- --host 0.0.0.0
```

Åpne `http://localhost:4173/Ready-Lilla-matchday/` med nett. Vent til service workeren er installert og aktiv (DevTools → Application → Service Workers), og last siden på nytt. Sett nettleseren i offline-modus og last siden på nytt igjen. Sjekk at app, ikoner og tidligere lokalt lagrede data fortsatt vises. Test også lukking og gjenåpning i flymodus på mobil etter publisering.

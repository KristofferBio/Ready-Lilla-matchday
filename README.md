# Ready Lilla – Kampstøtte

React-app for tropp, formasjoner, kampklokke, spilletid og bytter for Ready Lilla og Ready Grønn.

## Utvikling

```sh
npm install
npm run dev
```

## Lagadministrasjon

Bruk «Administrer lag» for å legge til lag med navn og farge, eller fjerne lag fra listen med bekreftelse. Ready Lilla og Ready Grønn brukes bare som startlag når ingen lagliste er lagret. En tom lagliste beholdes også etter omlasting.

Laglisten lagres lokalt per nettleser/enhet og synkroniseres foreløpig ikke. Fjerning sletter ikke lokale kampdata eller dokumenter i Firebase. Et nytt lag får en unik ID og starter med tom tropp; å opprette samme navn igjen gjenoppretter ikke det fjernede laget.

## Installerbar app og bruk uten nett

Produksjonsbygget har et PWA-manifest og en service worker som lagrer appens filer på enheten. Firebase-trafikk mellomlagres ikke av service workeren.

1. Åpne appen med nett og la første innlasting fullføre.
2. På iPhone: bruk Safari → Del → Legg til på Hjem-skjerm. På Android: bruk nettleserens installeringsvalg eller «Legg til på startskjermen».
3. Appen kan deretter åpnes uten nett, så lenge nettleseren ikke har slettet lagringen. Installasjon er valgfritt for offline-bruk.

Dette gjør selve appen tilgjengelig uten nett. Kampdata lagres allerede lokalt, men varig kø for skysynkronisering og håndtering av konflikter er ikke implementert ennå. Nettleserlagring er ikke en sikkerhetskopi.

Oppdateringer aktiveres når alle vinduer med appen er lukket, ikke ved tvungen omlasting midt i en kamp. Første innlasting og installasjon krever nett. HTTPS kreves ved publisering (localhost er tillatt ved lokal testing).

## Test produksjonsbygget uten nett

Service workeren er bevisst deaktivert i utviklingsmodus. Test med:

```sh
npm run build
npm run preview -- --host 0.0.0.0
```

Åpne `http://localhost:4173/Ready-Lilla-matchday/` med nett. Vent til service workeren er installert og aktiv (DevTools → Application → Service Workers), og last siden på nytt. Sett nettleseren i offline-modus og last siden på nytt igjen. Sjekk at app, ikoner og tidligere lokalt lagrede data fortsatt vises. Test også lukking og gjenåpning i flymodus på mobil etter publisering.

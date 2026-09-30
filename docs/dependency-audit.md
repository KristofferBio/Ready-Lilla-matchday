# Avhengighetskontroll – P0

Kontrollert 30. september 2026 med `npm audit` og `npm audit --omit=dev`. npm rapporterer avhengighetskjeder, ikke bare dist-bundlens faktisk brukte kode.

## Før oppdatering

Det opprinnelige prosjektet hadde 10 varslede pakker: én kritisk, sju høye, én moderat og én lav. Produksjonsavhengighetenes graf hadde fire varslede pakker. Innføring av Firebase-testverktøy la til noen utviklingsvarsler som ble vurdert separat.

| Pakke / høyeste nivå | Område og tiltak |
| --- | --- |
| `websocket-driver` / kritisk | Firebase-avhengighet, komprimerings-/protokollfeil. Oppdatert fra 0.7.4 til 0.7.5. |
| `@grpc/grpc-js` / høy | Node-gren av Firebase-avhengigheter, feilbehandling av meldinger. Oppdatert fra 1.9.15 til 1.9.16; Node-pakken i grafen er ikke i seg selv bevis på eksponering i nettleseren. |
| `protobufjs` / høy | Firebase-/verktøygraf; kodegenerering og ressursbruk. Oppdatert fra 7.5.5 til 7.6.6, med tilhørende hjelpepakker. |
| `vite` / høy | Utviklingsserver på Windows, alternative filbaner og NTLM-problem. Oppdatert fra 8.0.9 til 8.3.1 innen eksisterende `^8`-krav. |
| `postcss` / høy | Byggverktøy/source maps. Oppdatert fra 8.5.10 til 8.5.28. |
| `nanoid` / høy | Transitiv byggavhengighet. Oppdatert fra 3.3.11 til 3.3.19. |
| `brace-expansion` / høy | Transitive fil-/globverktøy; ressursbruk. Oppdatert fra 1.1.14 til 1.1.21. |
| `js-yaml` / høy | Utviklingsverktøy/YAML-parser. Ny løsning ved installasjon av testverktøy fjernet de rapporterte sårbarhetene. |
| `@babel/core` / lav | Byggverktøy/source maps. Oppdatert fra 7.29.0 til 7.29.7. |
| `@protobufjs/utf8` / moderat | Transitiv Firebase-avhengighet. Oppdatert fra 1.1.0 til 1.1.2. |

Endringene ble forhåndsvist med `npm audit fix --dry-run`; deretter brukt uten `--force` og uten major-oppgraderinger av appens direkte avhengigheter. Firebase SDK forblir 12.12.1. Lint, enhetstester, produksjonsbygg og emulatorregresjonstester brukes til kontroll; ren installasjon fra oppdatert lockfil er også verifisert.

## Resultat og gjenværende risiko

- `npm audit --omit=dev`: **0 varsler**.
- `npm audit`: **5 moderate**, ingen høye eller kritiske.
- Resterende kjeder er i **firebase-tools**, som bare brukes i utvikling/CI: `@opentelemetry/core` via `@google-cloud/pubsub`, og `uuid` via `gaxios`; npm teller også foreldrepakkene.
- Ingen `npm audit fix --force` er utført. Npms foreslåtte løsning ville endre Firebase CLI til en annen majorversjon og bør ikke gjøres uten egen kompatibilitetsvurdering.
- Midlertidig tiltak: CLI brukes kun til lokal Firestore-emulator for demo-prosjekt, ikke til ubetrodde data eller Pub/Sub-produksjonsoppgaver. Følg opp oppstrøms CLI-rettinger og kjør audit igjen ved oppdatering.
- Dette er ikke en godkjenning av produksjonens Firebase-regler; den gjennomgangen hører til tilgangsfasen.

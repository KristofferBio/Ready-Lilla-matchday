# Spec Delta

## Purpose

Avgrense tilgang til delte lagdata slik at bare godkjente trenere kan lese og endre tropp, oppsett, klokke og kampregistreringer.

## ADDED Requirements

### Requirement: Autorisert tilgang til delte lag
Tjenesten SHALL kreve verifisert identitet og lagtilgang ved lesing eller endring av delte lagdata. Kontrollene MUST håndheves av tjenesten, ikke bare av grensesnittet.

#### Scenario: En utenforstående kjenner lagets ID
- **WHEN** en bruker uten lagtilgang forsøker å lese eller endre laget med kjent ID
- **THEN** tjenesten avviser forespørselen uten å utlevere lagdata eller endre dem

#### Scenario: Godkjent trener åpner laget
- **WHEN** en identifisert trener med lagtilgang åpner laget
- **THEN** treneren får tilgang i samsvar med sin tildelte lese- eller redigeringsrett

### Requirement: Tilgang kan ikke egenoppgraderes
Tjenesten SHALL hindre at en bruker tildeler seg selv tilgang eller utvider sin egen rolle uten godkjent administrativ handling.

#### Scenario: Leser forsøker å bli redaktør
- **WHEN** en bruker med kun lesetilgang forsøker å endre sin rolle eller sende en kampendring direkte
- **THEN** tjenesten avviser begge forsøkene og eksisterende rettigheter beholdes

### Requirement: Identitet og offline data holdes adskilt
Appen SHALL beholde usynkroniserte endringer under den identiteten og laget de ble opprettet for, og SHALL ikke sende dem som en annen bruker etter kontobytte.

#### Scenario: Kontobytte med ventende endringer
- **WHEN** en trener forsøker å bytte konto mens endringer venter
- **THEN** appen varsler om endringene og sender dem ikke med den nye kontoens identitet

### Requirement: Eksisterende lag krever kontrollert tilknytning
Systemet SHALL ikke gjøre eksisterende lag tilgjengelig for nye brukere utelukkende fordi lagnavn eller lag-ID stemmer.

#### Scenario: Ny bruker oppretter et lag med samme navn
- **WHEN** en ny bruker oppretter et lag med navn som et eksisterende lag
- **THEN** brukeren får ikke tilgang til det eksisterende lagets data

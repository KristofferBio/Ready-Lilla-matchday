# Spec Delta

## Purpose

Gi treneren en flyttbar sikkerhetskopi av kampdata og en kontrollert måte å gjenopprette data uten utilsiktet tap eller ny lagtilgang.

## ADDED Requirements

### Requirement: Eksport av komplett lokalt kampbilde
Appen SHALL kunne eksportere lagidentitet, tropp, formasjon, oppsett, klokke, spilletid og byttelogg i et versjonert format, også uten nett. Eksporten SHALL opplyse om dataene inneholder usynkroniserte endringer.

#### Scenario: Eksport uten nett
- **WHEN** treneren eksporterer et lag med ventende endringer i flymodus
- **THEN** filen inneholder det siste lokalt lagrede kampbildet, formatversjon, eksporttidspunkt og opplysning om ventende synkronisering

### Requirement: Import kontrolleres før data endres
Appen SHALL validere format og referanser og vise hva som gjenopprettes før eksplisitt bekreftelse. Eksisterende data SHALL forbli uendret ved ugyldig fil eller avbrutt import.

#### Scenario: Filen er ugyldig eller bruker ukjent formatversjon
- **WHEN** treneren velger en ugyldig eksportfil
- **THEN** appen forklarer feilen og endrer ingen lag- eller kampdata

#### Scenario: Gjenoppretting over eksisterende kamp
- **WHEN** treneren bekrefter en validert gjenoppretting til et lag med redigeringstilgang
- **THEN** appen beholder en kopi av tidligere kampdata og sender gjenopprettingen gjennom samme kontroller som ordinære endringer

### Requirement: Sikkerhetskopi gir ikke tilgangsrettigheter
Systemet SHALL ikke gi brukeren nye lagrettigheter på grunnlag av identitet eller tilgangsinformasjon i en importert fil.

#### Scenario: Import av et annet lags eksport
- **WHEN** en bruker importerer en fil fra et lag brukeren ikke har redigeringstilgang til
- **THEN** filen kan ikke overskrive det delte lagets data eller gi brukeren tilgang til laget

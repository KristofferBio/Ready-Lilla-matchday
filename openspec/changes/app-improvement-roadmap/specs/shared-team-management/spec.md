# Spec Delta

## Purpose

La autoriserte trenere bruke samme lagliste på flere enheter uten tap av eksisterende data eller skjult overskriving av konkurrerende kampendringer.

## ADDED Requirements

### Requirement: Delt lagliste med stabile identiteter
Appen SHALL vise samme bekreftede lagliste for autoriserte trenere og SHALL bevare lagidentitet ved migrering og navneendring.

#### Scenario: Et lag legges til fra én enhet
- **WHEN** en autorisert trener legger til et lag og skyen bekrefter lagringen
- **THEN** laget vises med samme identitet på en annen tilkoblet, autorisert enhet

#### Scenario: Eksisterende lag migreres
- **WHEN** Ready Lilla og Ready Grønn knyttes til en godkjent trenergruppe
- **THEN** lag-ID-ene `ready-lilla` og `ready-gronn` og deres eksisterende kampdata beholdes

### Requirement: Lagfjerning er reversibel og eksplisitt
Appen SHALL kreve bekreftelse før et delt lag arkiveres, opplyse at handlingen påvirker den delte listen, og beholde kampdata. Arkiverte lag SHALL kunne gjenopprettes av en autorisert administrator.

#### Scenario: Treneren avbryter arkivering
- **WHEN** treneren velger å fjerne laget, men avbryter bekreftelsen
- **THEN** laget og alle kampdata forblir uendret

#### Scenario: Arkivering med ventende endringer
- **WHEN** et lag forsøkes arkivert mens klienten har usynkroniserte endringer for laget
- **THEN** arkiveringen blokkeres med forklaring og endringene beholdes

### Requirement: Konkurrerende kampendringer oppdages
Systemet SHALL oppdage når en kampendring er basert på en eldre bekreftet kampversjon og SHALL ikke stille overskrive en nyere konkurrerende endring. Klienten SHALL bevare den lokale endringen og vise behov for avklaring.

#### Scenario: To enheter gjør forskjellige bytter fra samme versjon
- **WHEN** én endring bekreftes først og den andre sendes fra den eldre kampversjonen
- **THEN** den andre endringen markeres som konflikt uten å overskrive den første og uten å slette den lokale endringen

#### Scenario: Konflikt kommer frem etter offline-bruk
- **WHEN** en offline-enhet kobles til etter at en annen trener har endret kampen
- **THEN** treneren får se at lokal og delt kampstatus avviker før en konkurrerende endring godkjennes

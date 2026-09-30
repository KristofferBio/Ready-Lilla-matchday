# Spec Delta

## Purpose

Sikre raske, forutsigbare og tilgjengelige handlinger på sidelinjen på mobil, samtidig som eksisterende bytteflyt og synlig spilletid beholdes.

## ADDED Requirements

### Requirement: Begge trykkretninger for bytter beholdes
Appen SHALL støtte benk-til-bane og bane-til-benk med trykk, markere valgt spiller rosa, og la et nytt trykk på samme spiller avbryte valget. Dra-og-slipp SHALL fortsatt være tilgjengelig.

#### Scenario: Benkspiller velges først
- **WHEN** treneren trykker på en benkspiller og deretter en banespiller
- **THEN** spillerne byttes og valgtmarkeringen fjernes

#### Scenario: Banespiller velges først
- **WHEN** treneren trykker på en banespiller og deretter en benkspiller
- **THEN** det samme byttet utføres med korrekt logg og spilletid

#### Scenario: Spilleren dras
- **WHEN** treneren drar en spiller til en annen plassering
- **THEN** flyttingen utføres én gang uten at en etterfølgende trykkhendelse utløser et ekstra bytte

### Requirement: Kampinformasjon er lesbar og tilgjengelig
Appen SHALL ved 320 CSS-pikslers skjermbredde vise spillernes spilletidsmerker uten avkutting og tilby spillerhandlinger via tastatur med synlig fokus og forståelige navn. Viktig status SHALL uttrykkes med tekst og ikke bare farge.

#### Scenario: Spissens spilletid på liten skjerm
- **WHEN** treneren åpner formasjonen `3-1-1-3` på en smal mobilskjerm
- **THEN** den sentrale spissens spilletidsmerke er synlig uten horisontal rulling

#### Scenario: Bytte med tastatur
- **WHEN** treneren navigerer mellom benk og bane med tastatur og aktiverer to spillere
- **THEN** byttet utføres gjennom samme lagringsflyt som et trykkbytte og fokus er synlig

### Requirement: Nullstilling er tydelig og bekreftet
Appen SHALL kreve bekreftelse ved nullstilling av spilletid og opplyse at bytteloggen også fjernes. Det SHALL ikke finnes en separat handling for nullstilling av bare bytteloggen.

#### Scenario: Treneren avbryter nullstilling
- **WHEN** treneren åpner bekreftelsen og velger Avbryt
- **THEN** både spilletid og byttelogg er uendret

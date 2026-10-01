# Spec Delta

## Purpose

Gi treneren samtidig tilgang til bane og benk i en fast kampflate på mobil uten at bytter eller panelåpning endrer plasseringen.

## ADDED Requirements

### Requirement: Kampdag viser bare relevante kontroller
Appen SHALL skjule lagvalg og formasjonsvalg i Kampdag og gjøre dem tilgjengelige i Tropp. Synlig forklaring av trykkbytter SHALL fjernes uten å fjerne valgmarkering eller tilgjengelige spillernavn.

#### Scenario: Treneren går til Tropp
- **WHEN** treneren åpner Tropp
- **THEN** lagvalg, lagadministrasjon og formasjon kan endres, mens de ikke vises i Kampdag

### Requirement: Fast bane og kompakt benk
Appen SHALL ved stående skjermstørrelser fra 320 × 568 CSS-piksler vise bane og to benkrader samtidig uten rulling av kampflaten. Benkknapper SHALL ha lik størrelse og fire kolonner. Flere enn åtte benkspillere SHALL være tilgjengelige gjennom intern benkrulling uten å flytte banen.

#### Scenario: Vanlig kamp med seks benkspillere
- **WHEN** en kamp med seks benkspillere vises på mobil
- **THEN** fire knapper ligger på første rad og to på andre, med lik størrelse og synlig bane

#### Scenario: Stor tropp
- **WHEN** mer enn åtte spillere sitter på benken
- **THEN** treneren kan rulle i benken og nå alle spillere mens banen står stille

### Requirement: Paneler endrer ikke kampgeometri
Appen SHALL åpne bytteloggen og nullstillingsbekreftelser over kampflaten uten å endre bane-/benkplassering. Paneler SHALL kunne lukkes med knapp og Escape, ha tilgjengelig tittel og holde tastaturfokus i panelet mens det er åpent.

#### Scenario: Bytteloggen åpnes og lukkes
- **WHEN** treneren åpner eller lukker bytteloggen
- **THEN** bane og benk beholder sine rektangler og kampdata er uendret

### Requirement: Skjermtilpasning bevarer bytter
Appen SHALL bevare bytter i begge trykkretninger og dra-og-slipp med korrekte målposisjoner etter endring av banestørrelse. Spilletidsmerker SHALL ikke klippes ved banens topp eller bunn.

#### Scenario: Bytte på skjermtilpasset bane
- **WHEN** treneren bytter en benkspiller med en banespiller på en smal eller høy skjerm
- **THEN** ett bytte registreres med korrekt oppsett, spilletid og logg uten at banen eller benken flyttes

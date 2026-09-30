# Spec Delta

## Purpose

Sikre at trenere kan fortsette kampen uten stabil dekning, og at lagrede endringer overlever gjenåpning og sendes korrekt til skyen.

## ADDED Requirements

### Requirement: Offline gjenåpning og gjenopptakelse
Appen SHALL etter en fullført første innlasting med nett kunne gjenåpnes uten nett med sist lagrede kampdata og ventende endringer, når enhetens lagring er tilgjengelig.

#### Scenario: Bytte etterfulgt av gjenåpning i flymodus
- **WHEN** treneren gjør et bytte uten nett og lukker og gjenåpner appen uten å slette nettleserdata
- **THEN** appen viser samme oppsett, spilletid og byttelogg og beholder endringen til synkronisering

#### Scenario: Nettet kommer tilbake
- **WHEN** appen får forbindelse igjen med ventende endringer
- **THEN** endringene sendes automatisk og fjernes fra køen først etter bekreftelse fra skyen

### Requirement: Korrekt samlet lagring
Appen SHALL lagre oppsett, spilletid og byttelogg som én logisk endring ved et bytte og SHALL ikke gjeninnføre slettede posisjoner eller nullstilt spilletid ved synkronisering.

#### Scenario: Forbindelsen brytes under lagring av bytte
- **WHEN** forbindelsen brytes mens et bytte lagres
- **THEN** skyen mottar enten hele bytteendringen eller ingen del av den, og uavklart lagring beholdes for nytt forsøk

#### Scenario: Nullstilling synkroniseres
- **WHEN** treneren bekrefter nullstilling av spilletid og lagringen når skyen
- **THEN** både spilletid og byttelogg er nullstilt på klienten som leser skydata

### Requirement: Vern mot forsinket innlasting
Appen SHALL ikke bruke eldre skydata til å overskrive lokale endringer som er gjort etter at skyinnlastingen startet eller som fortsatt venter på bekreftelse.

#### Scenario: Treneren redigerer mens første innlasting venter
- **WHEN** treneren endrer oppsett før en forsinket skyinnlasting fullfører
- **THEN** det nye lokale oppsettet beholdes og endringen forblir tilgjengelig for lagring

### Requirement: Ærlig status og håndtering av lagringsfeil
Appen SHALL skille mellom lokale data, ventende endringer, bekreftet synkronisering og feil. Hvis lokal lagring ikke lykkes, SHALL appen varsle tydelig og ikke påstå at endringen er trygt lagret.

#### Scenario: Tilgang til skyen avvises
- **WHEN** skyen avviser en lagring
- **THEN** ventende data beholdes, en feil vises og treneren kan forsøke igjen

#### Scenario: Enhetens lagring er full
- **WHEN** appen ikke kan lagre en endring lokalt
- **THEN** treneren får en tydelig feil og grensesnittet viser ikke endringen som varig lagret

### Requirement: Oppdateringer avbryter ikke kamp
Appen SHALL ikke tvinge omlasting eller aktivere en ny appversjon i et åpent kampvindu midt i en kamp.

#### Scenario: Ny versjon publiseres under kamp
- **WHEN** en ny appversjon blir tilgjengelig mens treneren bruker kampen
- **THEN** det åpne kampvinduet fortsetter uten tvungen omlasting

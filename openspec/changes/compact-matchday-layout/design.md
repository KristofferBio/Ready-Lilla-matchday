# Design

## Context

Eksisterende Kampdag er én vertikalt rullende side med lagvalg, formasjon, forklaring, bane, benk og logg. SVG-banens touchmål beregnes fra prosentkoordinater. Benken har variabel bredde per spiller. Se `proposal.md` for brukerens godkjente avgrensning.

## Goals / Non-Goals

**Goals:** Fast viewport-layout, like benkknapper, synlige tidsmerker og bevarte touch-/tastatur-/musehandlinger.

**Non-Goals:** Ingen endring i synk-/klokkelogikk, tilgang, lagdeling eller publisering. Ingen fysisk mobilgodkjenning uten faktisk utstyr.

## Decisions

- Appens topp har fast kompakt høyde; Tropp ruller separat og Kampdag fyller resten av `100dvh` med safe-area-padding.
- Banen får en egen fleksibel flate. ResizeObserver tilpasser SVG-viewBox-høyden til flaten, i stedet for å deformere spillersirkler med `preserveAspectRatio="none"`. Touchmål bruker SVG-transform og samme justerte koordinater som renderingen.
- Benken reserverer to rader à fire knapper uansett antall spillere. Ved flere enn åtte ruller bare benken; dette bevarer støtte for eksisterende troppgrense på 20.
- Native dialog brukes for logg, handlingsmeny og resetbekreftelser: fokus, Escape og overliggende plassering uten layoutendring. Panelene skriver aldri kampdata bare ved åpning/lukking.
- På lave, brede skjermer kan bane og benkdokk ligge ved siden av hverandre for å unngå en uleselig flat bane; benken beholder fire kolonner.
- Valgt spiller vises rosa; tilgjengelig status beholdes skjult visuelt. Synk-/lagringsfeil skal fortsatt være synlige uten at de endrer kampens geometri.

## Risks / Trade-offs

- [Svært små skjermer / ekstrem tekstzoom] → Test støttede størrelser eksplisitt; ikke hevde fysisk mobilverifikasjon eller full støtte for alle høyder.
- [Dra-mål avviker etter skalering] → Samme koordinatfunksjon ved rendering og touch-hit-testing; test touch-drag mot emulator.
- [Lange navn] → Mindre skrift og ellipsis, fullt navn i tilgjengelig knappnavn og title.
- [Benk med flere enn åtte] → Intern rulling og tilgjengelige alle-knapper; rullebevegelse må skilles fra drag på spillerne.
- [Nullstilling eller logg skyver skjermen] → Modal utenfor dokumentflyt; kontroller rektangler før/under/etter åpning.

# 360Drone – Tool pratiche ENAC

Repo interno per compilare **ATM-05B** (zone P/R/D) e **ATM-09A** (zone aeroporto).

## Workflow rapido (per operatore)

1. **Ricevi ordine** → prendi coordinate, data/ora locali, scopo
2. **Apri D-Flight** → verifica colore zona
   - **Zona colorata** (celeste 60m / gialla 45m / arancione 25m / rossa 0m) → usa **ATM-09A**
   - **Zona P/R/D** (carcere, prefettura, militare) → usa **ATM-05B**
3. **Compila il form giusto** e genera PDF
4. **Invia PEC almeno 15 giorni prima** (20 gg consigliati, 60 gg per militari)

## Link diretti
- **ATM-05B (P/R/D):** https://jiavandelli.github.io/360Drone/
- **ATM-09A (aeroporti):** https://jiavandelli.github.io/360Drone/atm09a.html

## Destinatari PEC

### ATM-05B
- **SEMPRE in cc:** protocollo@pec.enac.gov.it ; mobilita.innovativa@enac.gov.it
- **Carcere (P):** segreteriasicurezza.dap@giustiziacert.it
- **Quirinale (P):** segreteria.quirinale@pec.quirinale.it
- **Ministero Roma (P):** protocollo.prefrm@pec.interno.it
- **Prefettura (R):** protocollo.pref[XX]@pec.interno.it (es. RM → protocollo.prefrm@...)
- **Militare (R):** aerosquadra.coa@postacert.difesa.it
- **ENAV/Aeroporto (R):** operazioni.atm@enav.it

### ATM-09A
- **A:** protocollo.[regione]@pec.enac.gov.it (es. centro, nordovest, sud...)
- **CC:** operazioni.atm@enav.it ; mobilita.innovativa@enac.gov.it

## File nel repo
- `index.html` → compilatore ATM-05B (multi-zona)
- `atm09a.html` → compilatore ATM-09A (aeroporti)
- `README.md` → questa guida

## Note importanti
> **Bollo:** 360Drone ha autorizzazione al bollo virtuale (Aut. Dir. Reg. Entrate Lazio n. 135047/98 del 30/11/1998). Il PDF lo stampa in automatico, **non serve marca da €16**.

> **Orario:** ENAC vuole sempre **UTC**, non ora italiana.
> - Ora solare (inverno): Italia = UTC+1
> - Ora legale (estate): Italia = UTC+2
> - Esempio: volo alle 09:00 locali d'estate → scrivi **07:00 UTC**

> **Tempi:** 15 gg minimo per civili, 30 gg per zone rosse, 60 gg per militari. Invia prima per sicurezza.
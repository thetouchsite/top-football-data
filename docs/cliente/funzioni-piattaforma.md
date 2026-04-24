# Funzioni piattaforma — requisiti cliente

Fonte: documento «FUNZIONI PIATTAFORMA» (cliente, Touchsite / Top Football Data).  
Versione testuale in repository per ricerca e versioning; il file `.docx` originale resta riferimento formale.

## Stato implementazione corrente (aggiornamento 2026-04-24)

Questa pagina resta il riferimento requisiti cliente.
Lo stato implementato oggi, in sintesi, e questo:

- Sezione A - Modelli predittivi: largamente implementata
- Sezione B - Deep data: implementata in parte rilevante, ma ancora parziale sui dati avanzati giocatore
- Sezione C - Multi-Bet: implementata e operativa su 3 modalita + tab single
- Automazione Telegram / performance / retention: implementata in modo sostanziale
- Coerenza dati cross-pagine: rafforzata con snapshot versioning e cache policy allineata
- Logica Gold: rimossa dal prodotto e dal backend (non piu categoria attiva)

Stato reale pratico:
- Modelli singolo match: circa 90%
- Analisi statistica deep data: circa 70-78%
- Smart Multi-Bet Engine: circa 92%
- Automazione Telegram: circa 90%

Per il dettaglio operativo aggiornato fare riferimento a:
- `TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt`
- `RIEPILOGO_AUTOMAZIONE_BOT_TELEGRAM.txt`

---

## A. Modelli predittivi — singolo match (prediction engine)

### 1. Input dati e calcolo (backend)

Per ogni partita (es. Inter vs Milan), il sistema deve interrogare le **Prediction API di Sportmonks** e incrociarle con le **quote in tempo reale**.

#### A. Probabilità e valore

Per ogni mercato (**1X2**, **Under/Over**, **GG/NG**):

| Concetto | Descrizione |
|----------|-------------|
| **Probabilità modello** | Percentuale pura derivata dai dati (es. Inter vincente 45%). |
| **Quota modello** | Inverso della probabilità (es. 1 / 0,45 ≈ 2,22). |
| **Value bet alert** | Se la quota del bookmaker è superiore alla «quota modello», mostrare badge **VALUE BET +X%**. |

**Esempio:** quota modello 2,22 vs quota bookmaker 2,45 → **+10%** di valore.

### 2. xG e risultato esatto

Sotto il pannello principale:

- **Expected Goals (xG):** media gol attesi per squadra basata sulle ultime **5/10** partite.
- **Risultati esatti probabili:** i **3** punteggi con probabilità statistica più alta (es. 1-0, 1-1, 2-1).

### 3. Comparatore quote (widget)

Sotto ogni pronostico del singolo match: comparatore a **4 slot**:

1. **Slot 1:** quota più alta (top value).
2. **Slot 2–4:** bookmaker di riferimento scelti.

**Funzionalità:** accanto a ogni quota, pulsante di conversione (link affiliazione) e, se presente, indicazione valore extra (es. +2% valore).

**Nota legale (copy):** potrebbe essere necessario **non** usare la dicitura «Gioca ora»; usare un termine equivalente che resti una call-to-action chiara.

### 4. Visualizzazione (frontend)

- **Immagini (loghi / foto):** dove il feed espone asset per squadra, competizione o giocatore, l’interfaccia usa un contratto dati normalizzato (`media.imageUrl` opzionale `thumbUrl`, più `home_media` / `away_media` / `league_media` sul match) costruito lato integrazione Sportmonks, con **fallback su iniziali** se l’URL manca o non è caricabile — senza dipendere dal payload raw nelle pagine. In dark mode i loghi remoti sono mostrati su **fondo chiaro nel riquadro** (stesso componente condiviso) per garantire contrasto con asset pensati per sfondo chiaro.
- **Barre di confidenza:** barre di progresso (es. verdi) per la forza del segnale.
- **Formazioni:** integrare formazioni live (se disponibili da Sportmonks) per un **Reliability score**.
- **Toggle** «Mostra solo Value Bet» per utenti pro.
- **Grafico aggiuntivo:** radar o istogramma per **indice di pressione** previsto (es. squadra che attacca molto ma segna poco → supporto a value su Under / No Goal tramite dati xG).

---

## B. Analisi statistica — deep data

Obiettivo: incrociare dati storici con variabili in tempo reale (formazioni, infortuni) per giustificare i movimenti delle quote.

### 1. Probabili formazioni e impact player

Modulo tattico dinamico:

- **Aggiornamento ~60 min:** refresh automatico via API Sportmonks quando sono disponibili formazioni ufficiali.
- **Impact player analysis:** se un giocatore chiave (es. top scorer, assist-man) è assente, **penalizzazione automatica** alla probabilità di vittoria (es. −10% potenziale offensivo).
- **Dark mode tattica:** campo in stile «control room».

### 2. Player performance (player props)

- Tiri e **xG individuale** (media e qualità occasioni).
- **Heatmap** zone di movimento (se disponibili in API).
- **Dati disciplinari** (falli commessi/subiti) per ammonizioni/espulsioni.

### 3. Team momentum e expected points (xPts)

- **xPts:** punti «meritati» vs punti ottenuti (squadre sotto/sopravvalutate).
- **Pressure index graph:** andamento pressione offensiva prevista.
- **Tempi di segnatura:** quando la squadra segna o subisce di più (es. «forte nei primi 15 minuti»).

### Linee guida UX / integrazione

- Widget di conversione sotto il singolo giocatore (es. Lautaro) verso quota **marcatore** o **tiri in porta** del bookmaker partner.
- **Navigazione a tab:** «Probabili formazioni», «Player stats», «Team momentum» senza ricaricare la pagina (logica SPA).
- **Data validation:** se i dati giocatore non sono disponibili (es. lega minore), **nascondere** il modulo Player stats per pulizia layout.

### Comparatore in questa sezione (context awareness)

Il widget non deve mostrare solo 1X2 fisse: deve **seguire il tab** attivo.

| Contesto tab | Mercato quote (esempio) |
|--------------|-------------------------|
| Player stats → **Marcatori** | Endpoint quote **anytime goalscorer** (o equivalente API). |
| Player stats → **Disciplinari** | Endpoint **player_to_be_booked** (ammoniti). |

**Mapping:** ID giocatore (statistiche) ↔ quote su **4 bookmaker** selezionati; evidenziare la quota massima.

**Value sui giocatori:** stessa logica (probabilità modello vs quota implicita bookmaker) → value bet % sul marcatore.

**Lazy loading:** caricare le quote marcatori **solo** quando l’utente apre il tab del giocatore, per non appesantire il caricamento iniziale della pagina match.

---

## C. Bet multipla — orchestratore «Top Football Data»

### Concetto

Obiettivo: individuare dove il bookmaker offre quota **più alta** di quanto suggeriscono i dati (Sportmonks). Generare multiple **3 o 4** eventi con **valore atteso (EV) positivo**.

### Formula (come da documento)

Per ogni evento, calcolo **Edge** (vantaggio):

\[
\text{Edge} = \frac{\text{Probabilità dati} \times \text{Quota bookmaker}}{100}
\]

- Probabilità dati: da modello (es. 0,75 per 75%).
- Quota bookmaker: decimale (es. 1,60).

**Nota:** negli esempi numerici del documento l’edge è anche espresso come prodotto \( \text{quota} \times p \) (es. 1,30 × 0,85 = 1,10).

### Algoritmo in 3 step

1. **Filtro individuale:** solo match con **Edge singolo > 1,05** (~5% vantaggio). Scartare eventi ad altissima probabilità ma quota troppo bassa (es. edge 0,94).
2. **Composizione:** combinare **3 o 4** eventi filtrati; **EV totale** = prodotto degli edge (es. Edge₁ × Edge₂ × Edge₃).
3. **Validazione:** mostrare la multipla solo se **EV totale ≥ 1,15 / 1,20** (15–20% vantaggio complessivo); max **4** eventi (consigliati **3**).

### Output UI (dashboard)

- **Confidence score** (1–100) legato all’EV composto.
- **Data edge:** % vantaggio (es. +30%).
- **Probabilità di successo:** probabilità composta degli esiti (es. 38,6%).

### Comparatore

Stesso widget **4 slot** + CTA affiliazione e nota legale sulla copy (come sezione A).

### Note integrative

1. **Notifiche:** webhook / notifica (Telegram o push) quando l’orchestratore trova **singolo o multipla** con **EV > 1,25**, con messaggio tipo «Value combo +25%» e **comparatore** per la CTA.
2. **Performance storiche:** pagina automatizzata che registra ogni suggerimento (singola/multipla), esito **vinta/persa** a fine match, **grafico ROI**; sintesi inviabile anche su **canale Telegram**.

### Sintesi finale (documento)

Orchestratore multipla; edge ed EV; analisi statistica (xG, impact player, momentum); comparatore dinamico (1X2 e player props su 4 bookmaker); strategia **GEO/AI** (visibilità su motori e assistenti).

---

## Dipendenze tecniche implicite

- Contratto **Sportmonks** (add-on: odds, predictions, lineups, dati giocatore, ecc.) da allineare al piano reale.
- **Link affiliazione** e testi CTA soggetti a vincoli legali/commerciali.

---

## File correlati nel repository

- Originale: `FUNZIONI PIATTAFORMA .docx` (root del progetto, se presente).

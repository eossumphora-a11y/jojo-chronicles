# JoJo Chronicles — enciclopedia + resoconti in stile LoreMonkey

## Nuova pagina web — versione archivio interattivo

- **Nuovo:** sezione [Stand incontrati](https://eossumphora-a11y.github.io/jojo-chronicles/#/stand) aggiornata dai recap approvati, con soli dettagli rivelati ai PG.

- **Pagina giocatori:** https://eossumphora-a11y.github.io/jojo-chronicles/ — dashboard, diario narrativo, compendio, cronologia, indizi, ricerca testuale con fonti, collegamenti cliccabili fra schede e sessioni.
- **Studio Master online:** https://eossumphora-a11y.github.io/jojo-chronicles/master.html — accesso email/password con Supabase Auth e controllo ruolo admin tramite RLS, editor per schede pubbliche e private, cronologia di sessione e importazione di più SRT da unire per timestamp. La registrazione NON assegna automaticamente il ruolo admin; un amministratore deve inserirlo manualmente nella tabella user_roles.
- La fonte corrente della pagina giocatori è **Supabase**, esclusivamente record con visibilità `players`. Gli eventi della cronologia sono nel campo `public_events` e diventano illeggibili assieme alla sessione se viene ritirata dalla pubblicazione. Il file `docs/data/public.json` è ora vuoto e costituisce un fallback di configurazione, non un secondo database.
- Lo `studio/` del repository è il **precedente Studio locale IndexedDB**: le modifiche fatte solo lì non si sincronizzano con il database online.
- La ricerca nella pagina web è **testuale, non generativa**. Non è un servizio AI che risponde con un modello, non registra Discord e non trascrive audio direttamente dal browser. Non promettere funzioni di LoreMonkey che non sono implementate.


Un archivio per la campagna JoJo con due interfacce:

- **Master Studio** (`studio/`): enciclopedia completa, schede riservate, cronologia, citazioni, trascrizioni, editor, backup e approvazione delle pubblicazioni. Conserva i dati **nel browser locale** con IndexedDB.
- **Sito giocatori** (`docs/`): mostra i dati approvati in `docs/data/public.json` e legge automaticamente le voci con `visibility='players'` dal database Supabase dell'archivio. La lettura Supabase è limitata da Row Level Security; trascrizioni e note riservate non sono mai richieste dal browser.

Il sito è deliberatamente **vuoto all'inizio**: non vengono inventati fatti della campagna.

## 1. Avvio (Windows)

Installa Python se non presente e fai doppio clic su `start-local.bat`. Si apre `http://localhost:8765/studio/`. Il pubblico è su `http://localhost:8765/docs/`.

Su Mac/Linux: `./start-local.sh`. Puoi anche usare `python -m http.server 8765` dalla cartella principale.

**Non aprire direttamente `index.html` con `file://`**: il sito pubblico deve poter leggere il JSON tramite `fetch` e i browser possono limitare il salvataggio locale.

## 2. Creare il repository GitHub

1. In GitHub crea un repository **nuovo** chiamato per esempio `jojo-chronicles` (non inizializzarlo con README, perché ce n'è già uno).
2. Carica il contenuto della cartella del progetto nel repository, oppure esegui in questa cartella:

```bash
git init
git add .
git commit -m "Initial JoJo Chronicles"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/jojo-chronicles.git
git push -u origin main
```

3. Nella pagina GitHub del repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Il workflow `.github/workflows/pages.yml` pubblica **solo `docs/`**.
4. Segui il link del deployment nella sezione Actions o Pages per il sito pubblico.

Il codice di `studio/` può trovarsi nel repository, **ma non inserirvi backup, audio o trascrizioni**. In un repository pubblico anche i file non esposti su Pages sono visibili come sorgente. La cartella `studio/` contiene soltanto software, non dati sensibili.

## 3. Aggiornare l'enciclopedia pubblica

**Aggiornamento automatico dal database condiviso:** quando una voce viene approvata nel database Supabase e il campo `visibility` diventa `players`, il sito pubblico la carica senza nuovi commit GitHub. Le voci `master` restano invisibili. Se la connessione Supabase fallisce, rimane disponibile `docs/data/public.json` come fonte statica. **Nota:** Master Studio usa tuttora IndexedDB locale; le modifiche fatte solo nello Studio non vanno automaticamente in Supabase e richiedono il suo normale export `public.json`.



1. Apri Master Studio e crea le schede o i resoconti.
2. Se vuoi renderli pubblici, seleziona **Pubblica questa scheda/sessione**. Le note riservate e le trascrizioni NON vengono mai esportate.
3. Vai a **Pubblicazione → Scarica public.json**.
4. Sostituisci `docs/data/public.json` nel repository GitHub e crea un commit. GitHub Actions aggiornerà il sito.

**Importante:** la pubblicazione dei campi descrittivi è una decisione del Master. Anche un campo approvato potrebbe contenere spoiler: rileggilo prima dell'esportazione.

## 4. Sessioni e trascrizioni Discord/Craig

Apri una sessione, incolla la trascrizione nel campo riservato oppure importa un file TXT/SRT/VTT e usa **Copia prompt per il resoconto**. Incolla il prompt in ChatGPT: richiede stile sobrio e cronologico, senza invenzioni, con poche citazioni letterali e timestamp se disponibili. Copia le sezioni prodotte nel resoconto, cronologia e citazioni; correggi e approva prima della pubblicazione.

### Trascrizione automatica locale (opzionale)

1. Sul computer del Master installa Python 3.10–3.12 e fai doppio clic su **`installa-audio.bat`** (una sola volta). Su Linux/Mac esegui `./installa-audio.sh`. In alternativa: `python -m pip install -r transcription/requirements.txt`. L'installazione crea una cartella `.venv` privata che non va caricata su GitHub.
2. Apri `start-local.bat` (oppure `./start-local.sh` su Linux/Mac) e vai in **Studio → Sessioni → Nuova sessione**.
3. Premi **Trascrivi audio locale**, seleziona un audio WAV/MP3/M4A/FLAC/OGG/OPUS/WEBM/MP4/AAC o più tracce Craig sincronizzate. Il nome file di ciascuna traccia separata viene usato come etichetta del parlante. Un audio unico e misto **non permette di sapere chi parla**: il trascrittore non attribuisce i parlanti.
4. Attendi la trascrizione con timestamp e premi **Salva sessione**. Poi usa **Copia prompt per il resoconto** per ottenere il resoconto in ChatGPT, controllarlo e pubblicarlo se opportuno.

Il processo Whisper usa **CPU locale**; con il primo utilizzo scarica i pesi del modello da Internet (senza inviare l'audio). Gli audio sono elaborati in una cartella temporanea e cancellati al termine; rimane la trascrizione solo se salvi la sessione nel browser. Modelli selezionabili: base, small, medium (medium richiede maggiore memoria e tempo). Il server ascolta solo su `127.0.0.1:8765` e non è un servizio web pubblico. Limiti: 8 tracce, 160 MiB per file, 400 MiB totali.

Se non installi le dipendenze, lo Studio continua a funzionare come prima, ma il bottone audio mostra che il server di trascrizione non è disponibile. **La generazione AI del resoconto resta manuale**: per ora il sito non invia trascrizioni a provider esterni e non crea automaticamente un testo narrativo.

Formato eventi: `12:30 | Il gruppo entra nella sala`. Formato citazioni: `Nome | 34:02 | Frase esatta`.

## 5. Backup e limiti

- Tutte le modifiche del Master rimangono in **IndexedDB del browser sullo stesso origin** (es. `http://localhost:8765`). Usare un altro indirizzo, porta, browser o computer comporta un archivio diverso.
- **Pubblicazione → Esporta backup** salva un file completo e riservato. **Importa backup** ripristina il lavoro dopo conferma.
- Non esiste ancora autenticazione, sincronizzazione multi-dispositivo o backend. Non pubblicare lo Studio Master stesso su un server condiviso credendo sia protetto da password.
- Il sito pubblico ha solo dati manualmente esportati, non crea né modifica voci.
- L'archivio dei personaggi e degli Stand è indipendente dalle regole, ma il manuale *JoJo's Bizarre Tabletop Game v1.13.1* può guidare la compilazione delle schede.

## Sicurezza

Nessuna password o token GitHub è incorporato in JavaScript. Il sito pubblico rende i testi come testo, non HTML attivo. La sincronizzazione GitHub non è automatica in questa versione: serve caricare e committare il JSON pubblico. Conserva i backup fuori dai repository condivisi.

## File principali

- `docs/index.html`, `docs/assets/`: interfaccia giocatori.
- `docs/data/public.json`: solo contenuti approvati.
- `studio/index.html`, `studio/app.js`: applicazione Master.
- `.github/workflows/pages.yml`: pubblicazione automatica dei file in `docs` dopo un commit.

## Verifiche incluse

- `node --check studio/app.js` e `node --check docs/assets/public.js`: controllo sintattico JavaScript.
- `node tests/check_public_export.js`: controllo del filtro di esportazione e dei dati riservati.
- `python tests/test_site.py`: prova automatica end-to-end con Playwright e Chromium (eseguibile su una macchina in cui Chromium può navigare verso `localhost`). Non è stata eseguita con successo nell'ambiente di preparazione, dove le policy del browser bloccano tutte le navigazioni, incluse quelle locali.

## Archivio aggiornato esclusivamente dalle sessioni (novità)

**Fonte di verità:** registrazione e trascrizione → resoconto → personaggi, Stand e oggetti verificati. Non precaricare automaticamente schede di Foundry, bozze o concept art. Il precedente catalogo preparatorio di 19 schede **non è importato** e non viene pubblicato.

### Configurare il modello AI locale (una volta sola)

Il pulsante audio usa Whisper; per ottenere anche il **resoconto automatico e il riconoscimento delle entità** serve installare [Ollama](https://ollama.com/) sul PC del Master. Poi da un terminale:

```bash
ollama pull qwen2.5:7b
```

Ollama deve rimanere avviato mentre usi lo Studio Master. Il modello richiede alcuni gigabyte di RAM e spazio su disco e può essere lento su CPU. Nessuna registrazione o trascrizione viene inviata a servizi AI nel cloud da questa integrazione. Modello predefinito: `qwen2.5:7b`, modificabile nello Studio.

### Flusso operativo

1. Avvia `start-local.bat`; crea o apri una sessione nello Studio Master.
2. Carica una registrazione con **Trascrivi audio locale**, oppure importa una trascrizione TXT/SRT/VTT. Lo Studio prova automaticamente a generare il recap con Ollama (pulsante **Genera recap dalla trascrizione** per riprovare).
3. **Rileggi e correggi il recap**, poi premi **Salva sessione**. Lo Studio estrae automaticamente dal recap soltanto i nomi espliciti di **personaggi, Stand e oggetti**.
4. Per ogni nome serve un riferimento letterale sia nel recap sia nella trascrizione originale. L'AI deve inoltre restituire un estratto esatto del recap che ne giustifichi l'inserimento.
5. Lo Studio crea o aggiorna la voce **senza duplicati**, inserendo nelle note private il numero e il titolo della sessione, più la frase di riferimento. Non modifica automaticamente informazioni preesistenti non verificate.
6. **Tutte le nuove schede sono inizialmente riservate.** Dopo la tua verifica, puoi contrassegnare le voci come pubbliche. Vai in **Pubblicazione → Scarica public.json** e sostituisci `docs/data/public.json` su GitHub per aggiornare il sito dei giocatori. La sincronizzazione GitHub non è ancora automatica.

L'AI può confondere nomi o categorie: le verifiche testuali riducono, ma non eliminano, i falsi positivi. Se manca Ollama, puoi usare **Copia prompt per il resoconto** e fare l'analisi con ChatGPT, ma il catalogo non si aggiorna automaticamente senza un motore locale. Per rilanciare l'estrazione di una sessione già salvata, aprila e premi **Aggiorna enciclopedia dal recap**.

**Importante:** i dati rimangono salvati nel browser con IndexedDB; usa **Esporta backup** regolarmente. Una modifica nel Master Studio non viene inviata automaticamente al sito pubblico.

## Stand incontrati — dossier senza spoiler

Il sito pubblico ha una sezione dedicata **Stand incontrati** (\`#/stand\`), accessibile anche dal menu laterale e dalla panoramica. Non è un catalogo completo degli Stand progettati.

**Regola di visibilità:** uno Stand entra nella sezione solo se esiste una scheda pubblicata (\`category=stand\`, \`visibility=players\`) **e** una sessione pubblica in cui quel nome appare nel recap o negli eventi approvati. Un collegamento interno fra schede, da solo, non basta. Il sito non deduce abilità dalle schede Foundry, non elenca gli Stand privati e non ricava informazioni da sessioni non pubblicate. I riferimenti ai recap sono cliccabili.

**Contenuti mostrati:** nome approvato, riassunto dei fatti noti e i soli poteri o comportamenti che il Master ha approvato in \`public_details\`. Non vengono mostrati portatore segreto, poteri futuri, caratteristiche numeriche, note riservate o relazioni non approvate. Se non c'è nulla di verificato sui poteri, la sezione dichiara che non ne sono ancora stati identificati.

### Come pubblicare uno Stand dallo Studio Master online

1. Pubblica il recap della sessione in cui il nome dello Stand è stato effettivamente rivelato.
2. Crea o modifica una scheda nella categoria **Stand** nell'[Area Master](https://eossumphora-a11y.github.io/jojo-chronicles/master.html).
3. Imposta **Accaduto in gioco** e **Giocato-verificato**, scrivi nel riassunto e nei dettagli pubblici **soltanto ciò che i PG hanno visto** e cita la sessione nel campo **Fonte**.
4. Pubblica ai giocatori: lo Studio rifiuta una scheda Stand se non riesce a trovare il nome nel recap di una sessione pubblica. Esporta contenuti privati **solo** nei campi riservati.
5. Non è necessario aggiornare GitHub: la sezione Stand carica i record pubblici da Supabase a ogni apertura del sito.

**Limite attuale:** la scheda dello Stand deve essere creata/approvata nell'Area Master. Questa versione non trasforma da sola ogni nuova registrazione in una scheda del database online; il processo di trascrizione/estrazione automatico esistente nel vecchio Studio locale è distinto.

## Correzioni canoniche — La prova del fiume

Confermate dal Master il 22 ottobre 2026: **JustIn Time** è lo Stand armato di grande fucile che compare all'inizio della prova. Il **mal di testa** subito da Mariah e altri portatori durante lo scontro è la manifestazione della **dissonanza** fra Stand. Questi due fatti compaiono nei recap breve, standard e combattimento, nella scaletta e nelle voci pubbliche approvate. Nessun portatore aggiuntivo o potere non osservato viene inventato.

### Accesso all'Area Master online

Apri https://eossumphora-a11y.github.io/jojo-chronicles/master.html e fai **Accedi**. La registrazione pubblica **non è più presente nell'interfaccia**. Un amministratore Supabase deve prima creare o invitare il tuo account da **Authentication → Users → Add user → Send invitation**. Dopo l'accettazione dell'invito, deve associare il tuo UID al ruolo `admin` in `public.user_roles` (controllando quali campi richiede realmente lo schema). L'app verifica il ruolo tramite la RPC `is_admin()`. Se compare **Abilitazione necessaria**, copia l'UID e verifica l'assegnazione. Non condividere password o chiavi di servizio.

**Fondamentale per la sicurezza:** nascondere il pulsante «Crea account» non blocca l'endpoint Supabase Auth. Nel Dashboard Supabase, nelle impostazioni di **Authentication → Providers / Sign In**, disattiva **Allow new users to sign up**. Fino a quando questo intervento server-side non viene eseguito, nuove persone potrebbero ancora creare account Auth direttamente tramite API, anche se non diventerebbero Master senza un ruolo admin autorizzato. È necessario mantenere attive e corrette le policy RLS.

## Stand nella pagina di ogni sessione

La sezione **Notes** di ciascun recap include ora quattro colonne: **NPCs, Items, Stands, Locations**. **Stands** è immediatamente accanto a **Items** e mostra soltanto Stand la cui scheda sia pubblicata e il cui nome compaia nel recap o negli eventi pubblici di quella specifica sessione. Ogni riga permette di consultare il dossier e ogni anteprima usa un brano documentato del recap quando disponibile.

La voce laterale **Stand incontrati** (`#/stand`) è il catalogo cumulativo degli Stand approvati e nominati in almeno una sessione pubblica. Uno Stand nominato solo nella seconda sessione non apparirà nella prima; gli Stand delle bozze Master non appariranno mai. I contenuti mostrati provengono esclusivamente dai dati pubblici approvati, senza abilità o portatori segreti.

### Account Master

L'account Master online richiede **Supabase Auth + ruolo admin** nel progetto. Il solo GitHub non consente di creare utenti Supabase e non si devono salvare password, token o credenziali in questo repository. Per gestire account e autorizzazioni direttamente da ChatGPT occorre collegare l'integrazione Supabase, oppure l'amministratore del progetto deve creare e autorizzare l'account dal dashboard.

## Stand mancanti dal DB: POOR SOULS

Per **La prova del fiume**, POOR SOULS risulta documentato nella versione narrativa pubblica del recap (`docs/data/session-formats.json`) e nella voce editoriale già pubblica (`docs/data/editorial-public-v1.json`). La pagina ora verifica le menzioni anche nelle versioni pubbliche del recap, non soltanto nel riassunto grezzo Supabase.

In assenza di una riga pubblica per POOR SOULS nel database, usa **solo** la voce editoriale pubblica esistente come dossier limitato (Atto 2, aspetto da canocchia mantide, chele e attacchi esplosivi già raccontati). La scheda compare soltanto se una sessione visibile ai giocatori ne riporta espressamente il nome. Nessun dato nascosto del manuale/Foundry viene importato. Il fallback non crea né modifica record nel database Supabase.

# JoJo Chronicles — enciclopedia + resoconti in stile LoreMonkey

## Nuova pagina web — versione archivio interattivo

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

# JoJo Chronicles — enciclopedia + resoconti in stile LoreMonkey

Un archivio per la campagna JoJo con due interfacce:

- **Master Studio** (`studio/`): enciclopedia completa, schede riservate, cronologia, citazioni, trascrizioni, editor, backup e approvazione delle pubblicazioni. Conserva i dati **nel browser locale** con IndexedDB.
- **Sito giocatori** (`docs/`): mostra solo quanto è presente nel file `docs/data/public.json`. Legge nomi, sintesi, descrizioni, collegamenti, sessioni e citazioni approvate; non ha accesso al database Master.

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

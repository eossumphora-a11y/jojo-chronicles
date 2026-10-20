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

Questa versione **non trascrive audio automaticamente** e **non invia trascrizioni ad alcun servizio esterno**. La generazione AI avviene solo quando incolli manualmente il prompt in ChatGPT.

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

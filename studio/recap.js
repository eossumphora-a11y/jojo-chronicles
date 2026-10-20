/* JoJo Chronicles: recap -> verified Master catalog; never writes to public site. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const summary = byId("session-summary");
  const transcript = byId("session-transcript");
  if (!summary || !transcript) return;
  const resultBar = document.createElement("p");
  resultBar.className = "notice";
  resultBar.hidden = true;
  resultBar.setAttribute("role", "status");
  const sessionList = byId("session-list");
  if (sessionList) sessionList.parentNode.insertBefore(resultBar, sessionList);

  const controls = document.createElement("div");
  controls.className = "action-row";
  controls.style.cssText = "flex-wrap:wrap;margin:9px 0;align-items:center";
  const generate = document.createElement("button");
  generate.type = "button"; generate.className = "btn subtle";
  generate.textContent = "Genera recap dalla trascrizione";
  const extract = document.createElement("button");
  extract.type = "button"; extract.className = "btn ghost";
  extract.textContent = "Aggiorna enciclopedia dal recap";
  const label = document.createElement("label");
  label.className = "muted small"; label.textContent = "Modello locale ";
  const model = document.createElement("input");
  model.className = "field";
  model.style.cssText = "display:inline-block;width:145px;margin-left:7px";
  model.value = "qwen2.5:7b";
  model.maxLength = 90;
  label.append(model);
  controls.append(generate, extract, label);
  const status = document.createElement("p");
  status.className = "upload-help";
  status.style.cssText = "margin:7px 0 10px";
  status.setAttribute("role","status");
  status.textContent = "Solo un recap salvato può generare nuove schede. Le schede restano riservate fino alla tua approvazione.";
  summary.after(controls, status);

  const setStatus = (message, persistent=false) => {
    status.textContent = message;
    if (persistent && resultBar) {
      resultBar.textContent = message;
      resultBar.hidden = false;
    }
  };
  const request = async (path, body) => {
    let response;
    try {
      response = await fetch(path, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });
    } catch {
      throw Error("Server locale non disponibile. Avvia start-local.bat.");
    }
    let json;
    try { json = await response.json(); }
    catch { throw Error("Risposta non valida dal servizio AI locale."); }
    if (!response.ok) throw Error(typeof json.detail === "string" ? json.detail : "Il modello AI non ha risposto correttamente.");
    return json;
  };
  const currentModel = () => model.value.trim() || "qwen2.5:7b";
  const renderTimeline = items => (items || []).map(x => (x.time ? x.time + " | " : "") + x.text).join("\n");
  const renderQuotes = items => (items || []).map(x => [x.speaker||"", x.time||"", x.text||""].join(" | ")).join("\n");
  let processing = false, extracting = false;
  const generateRecap = async () => {
    if (processing) return;
    const source = transcript.value.trim();
    if (!source) { setStatus("Prima importa o trascrivi una registrazione."); return; }
    if (summary.value.trim() && !confirm("Sostituire il resoconto attualmente scritto con una nuova versione?")) return;
    processing = true; generate.disabled = true;
    setStatus("Sto costruendo il recap dalla trascrizione con Ollama in locale. Le sessioni lunghe possono richiedere diversi minuti.");
    try {
      const data = await request("/api/recap/generate", {
        transcript: source,
        title: byId("session-title").value.trim() || "Sessione senza titolo",
        model: currentModel()
      });
      if (!data.summary) throw Error("Il modello ha restituito un recap vuoto.");
      summary.value = data.summary;
      byId("session-events").value = renderTimeline(data.events);
      byId("session-quotes").value = renderQuotes(data.quotes);
      setStatus("Recap creato. Controlla i fatti, correggi eventuali errori e premi «Salva sessione»: l'enciclopedia sarà aggiornata automaticamente.");
    } catch (error) {
      setStatus("Recap non generato: " + error.message);
    } finally {
      processing = false; generate.disabled = false;
    }
  };
  const extractRecap = async (sessionId, recap, automated=false) => {
    if (extracting) return;
    if (!sessionId || !recap.trim()) {
      setStatus("Prima salva la sessione con un recap e poi riprova.");
      return;
    }
    extracting = true; extract.disabled = true;
    setStatus("Analizzo i nomi presenti nel recap e verifico le frasi di origine…" ,true);
    try {
      const result = await request("/api/recap/extract", {summary:recap, model:currentModel()});
      if (!(result.entities||[]).length) {
        setStatus("Nessun nuovo nome certo di personaggio, Stand o oggetto trovato nel recap. Non aggiungo nulla.",true);
      } else {
        window.dispatchEvent(new CustomEvent("jojo:catalog-commit",{
          detail:{sessionId,recap,candidates:result.entities}
        }));
      }
    } catch (error) {
      setStatus("Non ho aggiornato l'enciclopedia: " + error.message
        + (automated ? " Puoi riprovare dalla sessione salvata." : ""), true);
    } finally {
      extracting = false; extract.disabled = false;
    }
  };

  generate.addEventListener("click", generateRecap);
  extract.addEventListener("click", () => {
    const sessionId = byId("session-id").value.trim();
    extractRecap(sessionId,summary.value.trim(),false);
  });
  window.addEventListener("jojo:session-saved", event => {
    const {sessionId, recap} = event.detail || {};
    if (sessionId && String(recap||"").trim()) {
      extractRecap(sessionId, String(recap).trim(), true);
    }
  });
  window.addEventListener("jojo:catalog-result", event => {
    setStatus(event.detail?.message || "Aggiornamento enciclopedia completato.",true);
  });
  window.addEventListener("jojo:transcript-ready", () => {
    if (!transcript.value.trim()) return;
    generateRecap();
  });
})();

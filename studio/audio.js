(() => {
  "use strict";
  const base = document.getElementById("import-transcript");
  const textarea = document.getElementById("session-transcript");
  if (!base || !textarea) return;

  const wrap = document.createElement("div");
  wrap.className = "action-row";
  wrap.style.cssText = "flex-wrap:wrap;align-items:center;margin-top:10px";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn subtle";
  button.textContent = "Trascrivi audio locale";
  button.title = "Whisper sul tuo computer: audio WAV, MP3, M4A, FLAC, OGG, OPUS, WEBM, MP4, AAC.";
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".wav,.mp3,.m4a,.flac,.ogg,.opus,.webm,.mp4,.aac,audio/*";
  picker.multiple = true;
  picker.hidden = true;
  const modelLabel = document.createElement("label");
  modelLabel.className = "muted small";
  modelLabel.textContent = "Qualità ";
  const select = document.createElement("select");
  select.className = "field";
  select.style.cssText = "display:inline-block;width:auto;margin:0 0 0 7px";
  for (const [value, text] of [["base", "Veloce"], ["small", "Bilanciata"], ["medium", "Accurata / lenta"]]) {
    const option = document.createElement("option");
    option.value = value; option.textContent = text; select.append(option);
  }
  select.value = "small";
  modelLabel.append(select);
  wrap.append(button, modelLabel, picker);
  const hint = document.createElement("p");
  hint.className = "upload-help";
  hint.style.margin = "7px 0 0";
  hint.textContent = "Più tracce Craig: selezionale insieme, con nome del parlante nel file e inizio sincronizzato. Un audio misto avrà parlanti non attribuiti.";
  const status = document.createElement("p");
  status.className = "upload-help";
  status.setAttribute("role", "status");
  status.style.margin = "7px 0 0";
  base.parentNode.append(wrap, hint, status);

  button.addEventListener("click", () => picker.click());
  picker.addEventListener("change", async () => {
    const files = [...(picker.files || [])];
    picker.value = "";
    if (!files.length) return;
    if (textarea.value.trim() && !confirm("Sostituire la trascrizione presente con quella generata dall'audio?")) return;
    if (files.length > 8) { status.textContent = "Massimo 8 tracce per volta."; return; }
    button.disabled = true;
    select.disabled = true;
    status.textContent = "Controllo del trascrittore locale…";
    try {
      const ping = await fetch("/api/status", { cache: "no-store" });
      if (!ping.ok) throw new Error("Il server audio locale non è attivo. Avvia start-local.bat e installa le dipendenze.");
      const capability = await ping.json();
      if (!capability.whisper_installed) throw new Error("Whisper non è installato. Consulta la sezione 'Trascrizione audio' nel README.");
      const form = new FormData();
      files.forEach(file => form.append("files", file, file.name));
      form.append("model", select.value);
      form.append("language", "auto");
      status.textContent = "Trascrizione in corso. Per registrazioni lunghe può richiedere diversi minuti; non chiudere la pagina.";
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      let result;
      try { result = await response.json(); }
      catch { throw new Error("Il server non ha restituito una risposta valida."); }
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Trascrizione non riuscita.");
      if (!result.transcript || !result.transcript.trim()) {
        status.textContent = "Nessun parlato rilevato nell'audio. La trascrizione precedente è rimasta invariata.";
        return;
      }
      textarea.value = result.transcript;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      window.dispatchEvent(new CustomEvent("jojo:transcript-ready"));
      status.textContent = "Completato: " + result.segments.length + " segmenti da " + result.track_count
        + " traccia/e. Premi «Salva sessione» per conservare il testo, poi «Copia prompt per il resoconto».";
    } catch (err) {
      status.textContent = "Errore: " + (err?.message || "trascrittore non raggiungibile.") + " (Non è stato sovrascritto nulla.)";
    } finally {
      button.disabled = false;
      select.disabled = false;
    }
  });
})();

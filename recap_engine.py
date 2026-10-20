"""Strict, local Ollama-powered recap extraction for JoJo Chronicles.

AI results are *proposals*, never facts. Names/evidence must literally occur
in the recap before they can enter the Master review queue.
"""
from __future__ import annotations
import json
import re
import urllib.error
import urllib.request

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
DEFAULT_MODEL = "qwen2.5:7b"
VALID_KINDS = {"character", "stand", "artifact"}
UNSUITABLE_NAMES = {"stand", "personaggio", "personaggi", "oggetto", "oggetti", "master", "giocatore", "giocatori",
                    "narratore", "protagonista", "sconosciuto", "sconosciuta", "lupo", "uomo", "donna"}
MAX_RECAP = 65000
MAX_TRANSCRIPT = 175000


def contains_mention(text: str, mention: str) -> bool:
    text = " ".join(str(text).casefold().split())
    mention = " ".join(str(mention).casefold().split())
    if not mention or len(mention) < 3 or len(mention) > 100:
        return False
    return re.search(r"(?<!\w)" + re.escape(mention) + r"(?!\w)", text) is not None


def parse_candidates(raw: dict | list, recap: str) -> list[dict]:
    """Only literal, attributed mentions. Never trust model output directly."""
    raw_items = raw.get("entities", []) if isinstance(raw, dict) else raw
    if not isinstance(raw_items, list):
        return []
    output, seen = [], set()
    for item in raw_items[:100]:
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind", "")).lower().strip()
        name = str(item.get("name", item.get("title", ""))).strip()[:100]
        evidence = str(item.get("evidence", "")).strip()[:350]
        if (kind not in VALID_KINDS or not name or name.casefold() in UNSUITABLE_NAMES
                or not contains_mention(recap, name) or not contains_mention(recap, evidence)):
            continue
        if len(evidence) < len(name):
            continue
        if (kind, name.casefold()) in seen:
            continue
        seen.add((kind, name.casefold()))
        # Summary is the verifiable passage, not AI-written ungrounded lore.
        output.append({"kind": kind, "title": name, "evidence": evidence, "summary": evidence, "public": False})
        if len(output) >= 40:
            break
    return output


def safe_timeline(value):
    rows = []
    if not isinstance(value, list):
        return rows
    for item in value[:100]:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text", "")).strip()[:400]
        time = str(item.get("time", "")).strip()[:12]
        if text:
            rows.append({"time": time if re.fullmatch(r"\d{1,2}:\d{2}(?::\d{2})?", time) else "", "text": text})
    return rows


def safe_quotes(value, transcript):
    quotes = []
    if not isinstance(value, list):
        return quotes
    for item in value[:10]:
        if not isinstance(item, dict):
            continue
        quote = str(item.get("text", "")).strip()[:300]
        if not quote or not contains_mention(transcript, quote):
            continue
        quotes.append({
            "speaker": str(item.get("speaker", "")).strip()[:80],
            "time": str(item.get("time", "")).strip()[:12],
            "text": quote,
        })
        if len(quotes) >= 3:
            break
    return quotes


def split_transcript(text: str, limit: int = 16000) -> list[str]:
    if len(text) <= limit:
        return [text]
    chunks, current = [], ""
    for line in text.splitlines(keepends=True):
        if len(line) > limit:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(line[i:i + limit] for i in range(0, len(line), limit))
            continue
        if len(current) + len(line) > limit:
            chunks.append(current)
            current = ""
        current += line
    if current:
        chunks.append(current)
    return chunks


def ollama_json(model: str, system: str, prompt: str) -> dict:
    if not re.fullmatch(r"[a-zA-Z0-9_./:-]{1,90}", model):
        raise ValueError("Nome modello non valido.")
    body = json.dumps({
        "model": model, "stream": False, "format": "json",
        "system": system,
        "prompt": prompt,
        "options": {"temperature": 0, "num_ctx": 8192},
    }).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL, body, {"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=600) as response:
            result = json.load(response)
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError("Ollama non è raggiungibile o la risposta è scaduta. Avvialo, poi installa il modello: ollama pull qwen2.5:7b") from exc
    try:
        output = json.loads(result["response"])
        if not isinstance(output, dict):
            raise ValueError("Formato inatteso.")
        return output
    except (KeyError, ValueError, TypeError) as exc:
        raise RuntimeError("Il modello locale non ha restituito JSON valido. Riprova.") from exc


RECAP_SYSTEM = """Sei un cronista della campagna JoJo. Scrivi in italiano un recap sobrio e cronologico, senza enfasi epica o battute inventate.
Usa SOLO gli eventi attestati dalla fonte allegata. Non trasformare supposizioni in fatti.
Non inventare identità, nomi, poteri, luoghi, artefatti, morti, conoscenze dei PG.
Restituisci un OGGETTO JSON:
{"summary":"4-8 paragrafi brevi di fatti in sequenza","events":[{"time":"MM:SS","text":"fatto osservato"}],"quotes":[{"speaker":"Nome solo se esplicito","time":"MM:SS","text":"citazione esatta"}]}
Se non ci sono citazioni verificabili lascia quotes vuoto.
"""


def create_recap(transcript: str, title: str, model: str) -> dict:
    transcript = transcript.strip()
    if not transcript:
        raise ValueError("Serve una trascrizione.")
    if len(transcript) > MAX_TRANSCRIPT:
        raise ValueError("Trascrizione troppo lunga (max 175.000 caratteri). Dividila in parti.")
    chunks = split_transcript(transcript)
    notes = []
    for i, chunk in enumerate(chunks, 1):
        if len(chunks) > 1:
            sub = ollama_json(model,
                "Estrai SOLO fatti cronologici dalla parte di una trascrizione GdR. Rispondi con JSON: {\"notes\":\"descrizione cronologica fattuale con timestamp della fonte\"}. Non inventare.",
                f"Sessione: {title}\nPARTE {i} DI {len(chunks)} (non conclusiva):\n{chunk}")
            notes.append(f"PARTE {i}:\n{str(sub.get('notes', ''))[:6500]}")
        else:
            notes.append(chunk)
    source = "\n\n".join(notes)
    recap = ollama_json(model, RECAP_SYSTEM, f"Sessione: {title}\nFONTE IN ORDINE CRONOLOGICO:\n{source}")
    summary = str(recap.get("summary", "")).strip()[:MAX_RECAP]
    if len(summary) < 30:
        raise RuntimeError("Resoconto troppo breve o non valido: il modello deve riprovare.")
    return {
        "summary": summary,
        "events": safe_timeline(recap.get("events")),
        "quotes": safe_quotes(recap.get("quotes"), transcript),
        "source": "trascrizione",
        "requires_review": True,
    }


EXTRACT_SYSTEM = """Sei un archivista di una campagna JoJo. NON inventare mai entità.
Estrai SOLTANTO i nomi PROPRI di PERSONAGGI, STAND e OGGETTI specifici ESPLICITAMENTE MENZIONATI NEL RESOCONTO.
Non usare conoscenza generale, schede Foundry, fiabe, ricordi o informazioni non presenti nel testo.
Non inserire generiche categorie ('Freccia' solo se identificata come oggetto specifico e nominata), nomi ipotizzati o entità incerte.
Per ogni voce:
- kind: character / stand / artifact
- name: nome esatto come nel recap
- evidence: UNA FRASE COPIATA LETTERALMENTE dal recap che menziona quel nome.
Se non c'è una frase copiata alla lettera o un nome certo, non creare una voce.
JSON richiesto: {"entities":[{"kind":"character","name":"...","evidence":"..."}]}.
"""


def extract_candidates(recap: str, model: str) -> list[dict]:
    recap = recap.strip()
    if not recap:
        raise ValueError("Serve il testo del recap.")
    if len(recap) > MAX_RECAP:
        raise ValueError("Recap troppo lungo.")
    raw = ollama_json(model, EXTRACT_SYSTEM, "RESOCONTO APPROVATO:\n" + recap)
    return parse_candidates(raw, recap)
